<?php

namespace App\Http\Controllers\Transaksi;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaksi\LaporKerusakanRequest;
use App\Models\Inventory;
use App\Models\Peminjaman;
use App\Models\Penanganan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class PenangananController extends Controller
{
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
    // -> catat laporan, status inventory jadi menunggu_perbaikan. Peminjaman tidak disentuh.
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
                    'peminjaman_id' => $this->peminjamanBerjalan($locked)?->id,
                    'dilaporkan_oleh_user_id' => $user->id,
                    'status' => 'dilaporkan',
                    'status_sebelum' => $locked->status,
                    'jenis_kerusakan' => $data['jenis_kerusakan'],
                    'keluhan' => $data['keluhan'],
                    'foto' => $path,
                    'tanggal_lapor' => $data['tanggal_lapor'],
                    'lapor_at' => now(),
                ]);

                // hanya status yang berubah; peminjam_id dibiarkan (barang tetap dipegang peminjamnya)
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

        return response()->json($this->payload($penanganan->load(['pelapor:id,name', 'penerima:id,name'])), 201);
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
        // if (! $this->isAdmin($user) && $inventory->peminjam_id !== $user->id) {
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

    // peminjaman berjalan yang membawa barang ini: peminjaman sendiri (barang utama) atau milik barang utamanya (kelengkapan)
    private function peminjamanBerjalan(Inventory $inventory): ?Peminjaman
    {
        if ($inventory->peminjam_id === null) {
            return null;
        }

        return Peminjaman::aktif()
            ->where('inventory_id', $inventory->parent_id ?? $inventory->id)
            ->latest('id')
            ->first();
    }

    // bentuk data yang dikirim ke frontend (waktu *_at dalam ISO 8601, jamnya diformat di browser)
    private function payload(Penanganan $p): array
    {
        return [
            'id' => $p->id,
            'inventory_id' => $p->inventory_id,
            'peminjaman_id' => $p->peminjaman_id,
            'status' => $p->status,
            'status_sebelum' => $p->status_sebelum,
            'jenis_kerusakan' => $p->jenis_kerusakan,
            'jenis_label' => Penanganan::JENIS[$p->jenis_kerusakan] ?? $p->jenis_kerusakan,
            'keluhan' => $p->keluhan,
            'foto_url' => Storage::disk('public')->url($p->foto),
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
}