<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaksi\LaporKerusakanRequest;
use App\Http\Requests\Transaksi\SelesaikanPenangananRequest;
use App\Http\Requests\Transaksi\TerimaPenangananRequest;
use App\Models\Inventory;
use App\Models\Pemakai;
use App\Models\Penanganan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use App\Notifications\InventoryKerusakanDilaporkan;
use App\Notifications\InventoryKerusakanSelesai;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PenangananController extends Controller
{
    // GET /penanganan?status=menunggu|diproses|berhasil|rusak_berat&jenis=&search=&page=&per_page=
    // daftar untuk halaman Penanganan Inventory. Tab -> filter:
    //   menunggu = dilaporkan, diproses = diterima, berhasil = selesai + hasil berhasil, rusak_berat = selesai + tidak_bisa_diperbaiki
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();
        $tab = $request->string('status')->toString();
        $jenis = $request->string('jenis')->toString();

        $paginator = Penanganan::with(['inventory:id,kode_inventory,nama,merk,type,serial_number,warna', 'pelapor:id,name', 'penerima:id,name'])
            ->when($tab === 'menunggu', fn ($q) => $q->where('status', 'dilaporkan'))
            ->when($tab === 'diproses', fn ($q) => $q->where('status', 'diterima'))
            ->when($tab === 'berhasil', fn ($q) => $q->where('status', 'selesai')->where('hasil', 'berhasil'))
            ->when($tab === 'rusak_berat', fn ($q) => $q->where('status', 'selesai')->where('hasil', 'tidak_bisa_diperbaiki'))
            ->when(array_key_exists($jenis, Penanganan::JENIS), fn ($q) => $q->where('jenis_kerusakan', $jenis))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(keluhan) LIKE ?', [$like])
                    ->orWhereHas('inventory', fn ($i) => $i
                        ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(nama) LIKE ?', [$like]))
                    ->orWhereHas('pelapor', fn ($u) => $u->whereRaw('LOWER(name) LIKE ?', [$like]))
                );
            })
            // antrian menunggu: yang paling lama dilaporkan di atas; tab lain: terbaru di atas
            ->when($tab === 'menunggu', fn ($q) => $q->orderBy('id'), fn ($q) => $q->orderByDesc('id'))
            ->paginate($perPage)
            ->through(fn (Penanganan $p) => $this->payload($p));

        // laporan yang sudah lewat 7 hari dan belum diterima (untuk lencana peringatan di halaman)
        $terlambat = Penanganan::where('status', 'dilaporkan')
            ->where('tanggal_lapor', '<', now()->subDays(7)->toDateString())
            ->count();

        return response()->json(array_merge($paginator->toArray(), ['terlambat' => $terlambat]));
    }

    // GET /inventory/{inventory}/penanganan -> riwayat kerusakan & perbaikan barang ini, terbaru di atas
    public function riwayat(Inventory $inventory): JsonResponse
    {
        $rows = Penanganan::where('inventory_id', $inventory->id)
            ->with(['pelapor:id,name', 'penerima:id,name'])
            ->latest('id')
            ->get()
            ->map(fn (Penanganan $p) => $this->payload($p));

        return response()->json($rows);
    }

    // POST /inventory/{inventory}/lapor-kerusakan (multipart: jenis_kerusakan, keluhan, tanggal_lapor, foto)
    // -> catat laporan, status inventory jadi menunggu_perbaikan. Pemakai tidak disentuh.
    public function store(LaporKerusakanRequest $request, Inventory $inventory): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $path = null;

        try {
            $penanganan = DB::transaction(function () use ($request, $user, $data, $inventory, &$path) {
                // kunci barangnya lalu cek ulang, supaya dua laporan bersamaan tidak lolos
                $locked = Inventory::lockForUpdate()->findOrFail($inventory->id);
                $this->ensureBisaDilapor($locked, $user);

                $path = $request->file('foto')->store('penanganan', 'public');

                $penanganan = Penanganan::create([
                    'inventory_id' => $locked->id,
                    'pemakai_id' => $this->peminjamanBerjalan($locked)?->id,
                    'dilaporkan_oleh_user_id' => $user->id,
                    'status' => 'dilaporkan',
                    'status_sebelum' => $locked->status,
                    'jenis_kerusakan' => $data['jenis_kerusakan'],
                    'keluhan' => $data['keluhan'],
                    'foto' => $path,
                    'tanggal_lapor' => $data['tanggal_lapor'],
                    'lapor_at' => now(),
                ]);

                // hanya status yang berubah; pemakai_saat_ini_id dibiarkan (barang tetap dipegang peminjamnya)
                $locked->update(['status' => 'menunggu_perbaikan']);

                return $penanganan;
            });
        } catch (Throwable $e) {
            // transaksi gagal: buang foto yang sempat tersimpan
            if ($path !== null) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }

        $this->kirimNotifikasiKerusakan($penanganan, $user);

        return response()->json($this->payload($penanganan->load(['pelapor:id,name', 'penerima:id,name'])), 201);
    }

    // POST /penanganan/{penanganan}/terima { tanggal_diterima }
    // -> laporan diterima untuk diperbaiki: status penanganan jadi diterima, status barang jadi diperbaiki.
    // Tidak ada struk di tahap ini (struk dicetak setelah perbaikan selesai).
    public function terima(TerimaPenangananRequest $request, Penanganan $penanganan): JsonResponse
    {
        // TODO(permission): hanya admin yang boleh menerima laporan
        $user = $request->user();
        $data = $request->validated();

        $diterima = DB::transaction(function () use ($penanganan, $data, $user) {
            // kunci laporannya lalu cek ulang, supaya dua admin yang menerima bersamaan tidak lolos
            $locked = Penanganan::lockForUpdate()->findOrFail($penanganan->id);

            if ($locked->status !== 'dilaporkan') {
                throw ValidationException::withMessages([
                    'penanganan' => 'Laporan ini sudah diproses atau dibatalkan, tidak bisa diterima lagi.',
                ]);
            }

            if ($data['tanggal_diterima'] < $locked->tanggal_lapor->format('Y-m-d')) {
                throw ValidationException::withMessages([
                    'tanggal_diterima' => 'Tanggal diterima tidak boleh sebelum tanggal lapor.',
                ]);
            }

            $inventory = Inventory::lockForUpdate()->findOrFail($locked->inventory_id);

            $locked->update([
                'status' => 'diterima',
                'tanggal_diterima' => $data['tanggal_diterima'],
                'diterima_at' => now(),
                'diterima_oleh_user_id' => $user->id,
            ]);

            // hanya status yang berubah; pemakai_saat_ini_id dibiarkan (kalau barang dipegang peminjam, tetap dipegang)
            $inventory->update(['status' => 'diperbaiki']);

            return $locked;
        });

        return response()->json($this->payload($diterima->load(['inventory:id,kode_inventory,nama,merk,type,serial_number,warna', 'pelapor:id,name', 'penerima:id,name'])));
    }

    // POST /penanganan/{penanganan}/selesai { hasil, tanggal_selesai, harga_jasa, biaya_komponen, catatan }
    // -> perbaikan selesai (berhasil atau tidak bisa diperbaiki). Nomor struk dibuat server.
    // Status barang: berhasil -> dipakai (kalau masih dipegang peminjam) atau tersedia; tidak bisa diperbaiki -> rusak_berat.
    public function selesai(SelesaikanPenangananRequest $request, Penanganan $penanganan): JsonResponse
    {
        // TODO(permission): hanya admin yang boleh menyelesaikan penanganan
        $data = $request->validated();

        $selesai = DB::transaction(function () use ($penanganan, $data) {
            // kunci laporannya lalu cek ulang, supaya dua admin yang menyelesaikan bersamaan tidak lolos
            $locked = Penanganan::lockForUpdate()->findOrFail($penanganan->id);

            if ($locked->status !== 'diterima') {
                throw ValidationException::withMessages([
                    'penanganan' => 'Laporan ini belum diterima, sudah selesai, atau dibatalkan, jadi tidak bisa diselesaikan.',
                ]);
            }

            if ($data['tanggal_selesai'] < $locked->tanggal_diterima->format('Y-m-d')) {
                throw ValidationException::withMessages([
                    'tanggal_selesai' => 'Tanggal selesai tidak boleh sebelum tanggal diterima.',
                ]);
            }

            $inventory = Inventory::lockForUpdate()->findOrFail($locked->inventory_id);
            $berhasil = $data['hasil'] === 'berhasil';

            $locked->update([
                'status' => 'selesai',
                'hasil' => $data['hasil'],
                'tanggal_selesai' => $data['tanggal_selesai'],
                'selesai_at' => now(),
                // rusak berat boleh kosong: disimpan null (di struk tampil '-'), bukan 0
                'harga_jasa' => $data['harga_jasa'] ?? null,
                'biaya_komponen' => $data['biaya_komponen'] ?? null,
                'catatan' => $data['catatan'] ?? null,
                'no_struk' => $this->nomorStruk(),
            ]);

            // hanya status yang berubah; pemakai_saat_ini_id dibiarkan (barang tetap dipegang peminjamnya)
            $inventory->update([
                'status' => $berhasil ? ($inventory->pemakai_saat_ini_id !== null ? 'dipakai' : 'tersedia') : 'rusak_berat',
            ]);

            return $locked;
        });

        $this->kirimNotifikasiSelesai($selesai, $request->user());

        return response()->json($this->payload($selesai->load(['inventory:id,kode_inventory,nama,merk,type,serial_number,warna', 'pelapor:id,name', 'penerima:id,name'])));
    }

    // format: PNG- + 6 karakter acak + jam-menit-detik, mis. PNG-95AYFF-131126 (dicek unik)
    private function nomorStruk(): string
    {
        do {
            $nomor = 'PNG-'.strtoupper(Str::random(6)).'-'.now()->format('His');
        } while (Penanganan::where('no_struk', $nomor)->exists());

        return $nomor;
    }

    private function isAdmin(User $user): bool
    {
        return $user->role?->nama === 'admin';
    }

    // aturan lapor: admin boleh semua barang, peminjam hanya barang yang sedang ia pinjam;
    // barang yang sudah dijual atau masih punya penanganan terbuka tidak bisa dilaporkan
    private function ensureBisaDilapor(Inventory $inventory, User $user): void
    {
        // TODO(permission): aktifkan lagi kalau hak akses role sudah diatur
        // (admin boleh semua barang, user peminjam hanya barang yang sedang ia pinjam)
        // if (! $this->isAdmin($user) && $inventory->pemakai_saat_ini_id !== $user->id) {
        //     throw ValidationException::withMessages([
        //         'inventory' => 'Kamu hanya bisa melaporkan kerusakan barang yang sedang kamu pinjam.',
        //     ]);
        // }

        if ($inventory->status === 'dijual') {
            throw ValidationException::withMessages([
                'inventory' => 'Inventory yang sudah dijual tidak bisa dilaporkan.',
            ]);
        }

        if (Penanganan::terbuka()->where('inventory_id', $inventory->id)->exists()) {
            throw ValidationException::withMessages([
                'inventory' => 'Inventory ini masih punya penanganan yang berjalan. Selesaikan atau batalkan dulu.',
            ]);
        }
    }

    // pemakai berjalan yang membawa barang ini: pemakai sendiri (barang utama) atau milik barang utamanya (kelengkapan)
    private function peminjamanBerjalan(Inventory $inventory): ?Pemakai
    {
        if ($inventory->pemakai_saat_ini_id === null) {
            return null;
        }

        return Pemakai::aktif()
            ->where('inventory_id', $inventory->parent_id ?? $inventory->id)
            ->latest('id')
            ->first();
    }

    // bentuk data yang dikirim ke frontend (waktu *_at dalam ISO 8601, jamnya diformat di browser)
    private function payload(Penanganan $p): array
    {
        $disk = Storage::disk('public');
        return [
            'id' => $p->id,
            'inventory_id' => $p->inventory_id,
            // hanya terisi kalau relasinya dimuat (daftar halaman Penanganan)
            'inventory' => $p->relationLoaded('inventory') && $p->inventory
                ? [
                    'id' => $p->inventory->id,
                    'kode_inventory' => $p->inventory->kode_inventory,
                    'nama' => $p->inventory->nama,
                    'merk' => $p->inventory->merk,
                    'type' => $p->inventory->type,
                    'serial_number' => $p->inventory->serial_number,
                    'warna' => $p->inventory->warna,
                ]
                : null,
            'pemakai_id' => $p->pemakai_id,
            'status' => $p->status,
            'status_sebelum' => $p->status_sebelum,
            'jenis_kerusakan' => $p->jenis_kerusakan,
            'jenis_label' => Penanganan::JENIS[$p->jenis_kerusakan] ?? $p->jenis_kerusakan,
            'keluhan' => $p->keluhan,
            'foto_url' => $disk->url($p->foto),
            'tanggal_lapor' => $p->tanggal_lapor->format('Y-m-d'),
            'lapor_at' => $p->lapor_at?->toIso8601String(),
            'tanggal_diterima' => $p->tanggal_diterima?->format('Y-m-d'),
            'diterima_at' => $p->diterima_at?->toIso8601String(),
            'tanggal_selesai' => $p->tanggal_selesai?->format('Y-m-d'),
            'selesai_at' => $p->selesai_at?->toIso8601String(),
            'harga_jasa' => $p->harga_jasa,
            'biaya_komponen' => $p->biaya_komponen,
            'hasil' => $p->hasil,
            'no_struk' => $p->no_struk,
            'catatan' => $p->catatan,
            'pelapor' => $p->pelapor?->name,
            'penerima' => $p->penerima?->name,
        ];
    }

    private function kirimNotifikasiKerusakan(Penanganan $penanganan, User $pelapor): void
    {
        try {
            $penerima = User::query()
                ->whereHas('role', fn ($q) => $q->whereIn('nama', ['manajer', 'hr', 'admin']))
                ->get();

            Notification::send(
                $penerima,
                new InventoryKerusakanDilaporkan($penanganan->loadMissing('inventory'), $pelapor->name)
            );
        } catch (Throwable $e) {
            Log::error('Gagal mengirim notifikasi kerusakan', [
                'penanganan_id' => $penanganan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function kirimNotifikasiSelesai(Penanganan $penanganan, User $penyelesai): void
    {
        try {
            $pelapor = User::find($penanganan->dilaporkan_oleh_user_id);

            if (! $pelapor) {
                return;
            }

            $pelapor->notify(
                new InventoryKerusakanSelesai($penanganan->loadMissing('inventory'), $penyelesai->id)
            );
        } catch (Throwable $e) {
            Log::error('Gagal mengirim notifikasi penanganan selesai', [
                'penanganan_id' => $penanganan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}