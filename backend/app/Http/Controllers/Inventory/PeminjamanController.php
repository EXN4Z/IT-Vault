<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\KembalikanRequest;
use App\Http\Requests\Inventory\SerahkanRequest;
use App\Models\Inventory;
use App\Models\Peminjaman;
use App\Models\PeminjamanItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PeminjamanController extends Controller
{
    // kolom inventory yang dipakai sebagai label di struk
    private const LABEL_COLUMNS = ['id', 'kode_inventory', 'nama', 'merk', 'type', 'warna'];

    // label + status (struk serah terima / cetak ulang; status dipakai modal Kembalikan untuk kondisi awal)
    private const STRUK_COLUMNS = ['id', 'kode_inventory', 'nama', 'merk', 'type', 'warna', 'status'];

    // GET /peminjaman/karyawan -> pilihan "Cari Karyawan Peminjam" (karyawan aktif)
    public function karyawan(): JsonResponse
    {
        return response()->json(
            User::where('status', 'aktif')->orderBy('name')->get(['id', 'name', 'nik'])
        );
    }

    // POST /inventory/{inventory}/serahkan (multipart: user_id, tanggal_penerimaan, catatan, foto[3])
    // -> serahkan barang utama ke karyawan; kelengkapannya ikut. Mengembalikan data untuk struk.
    public function store(SerahkanRequest $request, Inventory $inventory): JsonResponse
    {
        $this->ensureBisaDiserahkan($inventory);

        $data = $request->validated();
        $paths = [];

        try {
            $peminjaman = DB::transaction(function () use ($request, $data, $inventory, &$paths) {
                // kunci barangnya lalu cek ulang, supaya dua admin tidak menyerahkan barang yang sama bersamaan
                $locked = Inventory::lockForUpdate()->findOrFail($inventory->id);
                $this->ensureBisaDiserahkan($locked);

                foreach ($request->file('foto') as $file) {
                    $paths[] = $file->store('peminjaman', 'public');
                }

                $peminjaman = Peminjaman::create([
                    'inventory_id' => $locked->id,
                    'user_id' => $data['user_id'],
                    'nomor_penerimaan' => $this->nomorPenerimaan(),
                    'tanggal_penerimaan' => $data['tanggal_penerimaan'],
                    'catatan' => $data['catatan'] ?? null,
                    'foto' => $paths,
                    'created_by' => $request->user()->id,
                ]);

                // barang utama selalu jadi dipakai
                $locked->update(['status' => 'dipakai', 'peminjam_id' => $data['user_id']]);

                // kelengkapan: peminjamnya selalu ikut barang utama; statusnya jadi dipakai
                // hanya kalau sedang tersedia (yang rusak / diperbaiki tetap statusnya).
                // Tiap kelengkapan dicatat ikut dipakai di riwayat.
                foreach ($locked->children()->get() as $child) {
                    $child->update([
                        'peminjam_id' => $data['user_id'],
                        'status' => $child->status === 'tersedia' ? 'dipakai' : $child->status,
                    ]);

                    PeminjamanItem::buka($peminjaman, $child->id);
                }

                return $peminjaman;
            });
        } catch (Throwable $e) {
            // transaksi gagal: buang foto yang sempat tersimpan
            Storage::disk('public')->delete($paths);
            throw $e;
        }

        return response()->json($this->strukPayload($peminjaman, $inventory), 201);
    }

    // GET /inventory/{inventory}/struk -> cetak ulang struk serah terima yang sedang berjalan.
    // Nomor penerimaan tetap yang lama, tapi daftar kelengkapan dibaca ulang dari kondisi terbaru,
    // jadi kelengkapan yang dipasang menyusul ikut muncul. Modal Kembalikan juga memakai data ini.
    public function struk(Inventory $inventory): JsonResponse
    {
        $this->ensureSedangDipakai($inventory, 'Struk hanya bisa dicetak ulang untuk barang utama yang sedang dipakai.');

        return response()->json($this->strukPayload($this->peminjamanAktif($inventory), $inventory));
    }

    // POST /inventory/{inventory}/kembalikan { nomor_penerimaan, tanggal_pengembalian, catatan }
    // -> kembalikan barang utama beserta kelengkapannya. Mengembalikan data untuk struk pengembalian.
    public function kembalikan(KembalikanRequest $request, Inventory $inventory): JsonResponse
    {
        $this->ensureSedangDipakai($inventory, 'Hanya barang utama yang sedang dipakai yang bisa dikembalikan.');

        $data = $request->validated();

        $peminjaman = DB::transaction(function () use ($request, $data, $inventory) {
            // kunci barangnya lalu cek ulang, supaya dua admin tidak mengembalikan barang yang sama bersamaan
            $locked = Inventory::lockForUpdate()->findOrFail($inventory->id);
            $this->ensureSedangDipakai($locked, 'Hanya barang utama yang sedang dipakai yang bisa dikembalikan.');

            $peminjaman = $this->peminjamanAktif($locked);

            // kode peminjaman harus cocok dengan yang tertera di struk serah terima
            if (strcasecmp(trim($data['nomor_penerimaan']), $peminjaman->nomor_penerimaan) !== 0) {
                throw ValidationException::withMessages([
                    'nomor_penerimaan' => 'Nomor penerimaan tidak cocok dengan peminjaman barang ini.',
                ]);
            }

            if ($data['tanggal_pengembalian'] < $peminjaman->tanggal_penerimaan->format('Y-m-d')) {
                throw ValidationException::withMessages([
                    'tanggal_pengembalian' => 'Tanggal pengembalian tidak boleh sebelum tanggal penerimaan.',
                ]);
            }

            foreach ($locked->children()->get() as $child) {
                // yang tadinya dipakai jadi tersedia, yang rusak / diperbaiki tetap statusnya
                $kondisi = $child->status === 'dipakai' ? 'tersedia' : $child->status;

                // parent_id tidak berubah, jadi hook link di model tidak ikut jalan
                $child->update(['peminjam_id' => null, 'status' => $kondisi]);

                $ditutup = PeminjamanItem::where('peminjaman_id', $peminjaman->id)
                    ->where('inventory_id', $child->id)
                    ->whereNull('dikembalikan_at')
                    ->update(['dikembalikan_at' => now(), 'kondisi_kembali' => $kondisi]);

                // kelengkapan dari sebelum riwayat item ada: catat sekarang supaya tetap muncul di struk
                if ($ditutup === 0) {
                    PeminjamanItem::create([
                        'peminjaman_id' => $peminjaman->id,
                        'inventory_id' => $child->id,
                        'keterangan' => PeminjamanItem::KETERANGAN_IKUT,
                        'dikembalikan_at' => now(),
                        'kondisi_kembali' => $kondisi,
                    ]);
                }
            }

            // barang utama: dipakai jadi tersedia, kalau rusak / diperbaiki tetap statusnya (sama seperti kelengkapan)
            $kondisiUtama = $locked->status === 'dipakai' ? 'tersedia' : $locked->status;
            $locked->update(['peminjam_id' => null, 'status' => $kondisiUtama]);

            $peminjaman->update([
                'tanggal_pengembalian' => $data['tanggal_pengembalian'],
                'waktu_pengembalian' => now(),
                'kondisi_kembali' => $kondisiUtama,
                'catatan_kembali' => $data['catatan'] ?? null,
                'dikembalikan_oleh' => $request->user()->id,
            ]);

            return $peminjaman;
        });

        return response()->json($this->pengembalianPayload($peminjaman->fresh()));
    }

    // GET /peminjaman/{peminjaman}/struk-pengembalian -> cetak ulang struk pengembalian (dari riwayat)
    public function strukPengembalian(Peminjaman $peminjaman): JsonResponse
    {
        if (! $peminjaman->sudahKembali()) {
            throw ValidationException::withMessages([
                'peminjaman' => 'Peminjaman ini belum dikembalikan, jadi belum ada struk pengembalian.',
            ]);
        }

        return response()->json($this->pengembalianPayload($peminjaman));
    }

    // GET /inventory/{inventory}/riwayat -> riwayat peminjaman barang ini, terbaru di atas:
    // sebagai barang utama (peminjaman sendiri) dan sebagai kelengkapan (ikut barang utamanya)
    public function riwayat(Inventory $inventory): JsonResponse
    {
        $sebagaiUtama = $inventory->peminjaman()->with('peminjam:id,name')->get()->map(fn (Peminjaman $p) => [
            '_t' => $p->created_at,
            'id' => 'p'.$p->id,
            'peran' => 'utama',
            'peminjaman_id' => $p->id,
            'nomor_penerimaan' => $p->nomor_penerimaan,
            'tanggal_penerimaan' => $p->tanggal_penerimaan->format('Y-m-d'),
            'tanggal_pengembalian' => $p->tanggal_pengembalian?->format('Y-m-d'),
            // waktu lengkap (ISO 8601, UTC); jamnya diformat di browser sesuai zona waktu pengguna
            'waktu_penerimaan' => $p->created_at?->toIso8601String(),
            'waktu_pengembalian' => $p->waktu_pengembalian?->toIso8601String(),
            'peminjam' => $p->peminjam?->name,
            'induk' => null,
            'keterangan' => $p->catatan,
            'catatan_kembali' => $p->catatan_kembali,
            'berjalan' => ! $p->sudahKembali(),
            'bisa_cetak_pengembalian' => $p->sudahKembali(),
        ]);

        $sebagaiKelengkapan = $inventory->peminjamanItems()
            ->with(['peminjaman.peminjam:id,name', 'peminjaman.inventory:id,kode_inventory,nama'])
            ->get()
            ->map(fn (PeminjamanItem $i) => [
                '_t' => $i->created_at,
                'id' => 'i'.$i->id,
                'peran' => 'kelengkapan',
                'peminjaman_id' => $i->peminjaman_id,
                'nomor_penerimaan' => $i->peminjaman->nomor_penerimaan,
                'tanggal_penerimaan' => $i->peminjaman->tanggal_penerimaan->format('Y-m-d'),
                'tanggal_pengembalian' => $i->dikembalikan_at?->format('Y-m-d'),
                'waktu_penerimaan' => $i->peminjaman->created_at?->toIso8601String(),
                'waktu_pengembalian' => $i->dikembalikan_at?->toIso8601String(),
                'peminjam' => $i->peminjaman->peminjam?->name,
                'induk' => $i->peminjaman->inventory?->only(['id', 'kode_inventory', 'nama']),
                'keterangan' => $i->keterangan,
                'catatan_kembali' => $i->catatan_kembali,
                'berjalan' => $i->dikembalikan_at === null,
                // yang dilepas di tengah jalan tidak tercantum di struk pengembalian set
                'bisa_cetak_pengembalian' => $i->peminjaman->sudahKembali() && ! $i->dilepas,
            ]);

        $rows = $sebagaiUtama->concat($sebagaiKelengkapan)
            ->sortByDesc('_t')
            ->map(fn (array $r) => Arr::except($r, '_t'))
            ->values();

        return response()->json($rows);
    }

    // hanya barang utama berstatus tersedia yang boleh diserahkan
    private function ensureBisaDiserahkan(Inventory $inventory): void
    {
        $error = $inventory->serahError();

        if ($error) {
            throw ValidationException::withMessages(['inventory' => $error]);
        }
    }

    // barang utama (bukan kelengkapan) yang statusnya dipakai
    private function ensureSedangDipakai(Inventory $inventory, string $pesan): void
    {
        if ($inventory->parent_id !== null || $inventory->status !== 'dipakai') {
            throw ValidationException::withMessages(['inventory' => $pesan]);
        }
    }

    // peminjaman yang sedang berjalan untuk barang utama ini
    private function peminjamanAktif(Inventory $inventory): Peminjaman
    {
        $peminjaman = Peminjaman::aktif()
            ->where('inventory_id', $inventory->id)
            ->with('peminjam:id,name')
            ->latest('id')
            ->first();

        if (! $peminjaman) {
            throw ValidationException::withMessages([
                'inventory' => 'Riwayat serah terima barang ini tidak ditemukan.',
            ]);
        }

        return $peminjaman;
    }

    // data struk serah terima (dipakai saat serah terima, cetak ulang, dan modal Kembalikan)
    private function strukPayload(Peminjaman $peminjaman, Inventory $inventory): array
    {
        return [
            'nomor_penerimaan' => $peminjaman->nomor_penerimaan,
            'tanggal_penerimaan' => $peminjaman->tanggal_penerimaan->format('Y-m-d'),
            'catatan' => $peminjaman->catatan,
            'peminjam' => $peminjaman->peminjam->only(['id', 'name']),
            'inventory' => $inventory->only(self::STRUK_COLUMNS),
            'kelengkapan' => $inventory->children()->orderBy('kode_inventory')->get(self::STRUK_COLUMNS),
        ];
    }

    // data struk pengembalian: kelengkapan dibaca dari riwayat peminjaman (bukan susunan sekarang),
    // supaya struknya tetap sama walau link-nya berubah setelah dikembalikan
    private function pengembalianPayload(Peminjaman $peminjaman): array
    {
        $peminjaman->loadMissing(['peminjam:id,name', 'inventory:'.implode(',', self::LABEL_COLUMNS)]);

        $kelengkapan = $peminjaman->items()
            ->where('dilepas', false)
            ->with('inventory:'.implode(',', self::LABEL_COLUMNS))
            ->get()
            ->sortBy(fn (PeminjamanItem $i) => $i->inventory->kode_inventory)
            ->map(fn (PeminjamanItem $i) => [
                ...$i->inventory->only(self::LABEL_COLUMNS),
                'kondisi_kembali' => $i->kondisi_kembali,
            ])
            ->values();

        return [
            'nomor_penerimaan' => $peminjaman->nomor_penerimaan,
            'tanggal_penerimaan' => $peminjaman->tanggal_penerimaan->format('Y-m-d'),
            'tanggal_pengembalian' => $peminjaman->tanggal_pengembalian->format('Y-m-d'),
            'catatan' => $peminjaman->catatan,
            'catatan_kembali' => $peminjaman->catatan_kembali,
            'peminjam' => $peminjaman->peminjam->only(['id', 'name']),
            'inventory' => [
                ...$peminjaman->inventory->only(self::LABEL_COLUMNS),
                'kondisi_kembali' => $peminjaman->kondisi_kembali,
            ],
            'kelengkapan' => $kelengkapan,
        ];
    }

    // format: 6 karakter acak + jam-menit-detik, mis. 95AYFF-131126 (dicek unik)
    private function nomorPenerimaan(): string
    {
        do {
            $nomor = strtoupper(Str::random(6)).'-'.now()->format('His');
        } while (Peminjaman::where('nomor_penerimaan', $nomor)->exists());

        return $nomor;
    }
}