<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Pemakai;
use App\Models\Penanganan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

// data untuk dashboard user: barang yang sedang dipakai oleh user yang login
class MyInventoryController extends Controller
{
    // GET /my/inventory -> barang utama yang sedang dipegang user, lengkap dengan kelengkapan dan penanganan yang berjalan
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // barang utama yang dipegang user (kelengkapan ikut barang utamanya)
        $utama = Inventory::query()
            ->where('pemakai_saat_ini_id', $user->id)
            ->whereNull('parent_id')
            ->with('kategori:id,nama')
            ->orderBy('kode_inventory')
            ->get();

        $kelengkapan = Inventory::query()
            ->whereIn('parent_id', $utama->pluck('id'))
            ->orderBy('kode_inventory')
            ->get()
            ->groupBy('parent_id');

        // peminjaman yang sedang berjalan, per barang utama
        $pemakai = Pemakai::aktif()
            ->whereIn('inventory_id', $utama->pluck('id'))
            ->get()
            ->keyBy('inventory_id');

        // penanganan yang masih berjalan, per barang (utama maupun kelengkapan)
        $semuaId = $utama->pluck('id')->merge($kelengkapan->flatten()->pluck('id'));
        $penanganan = Penanganan::terbuka()
            ->whereIn('inventory_id', $semuaId)
            ->get()
            ->keyBy('inventory_id');

        // penanganan yang selesai kurang dari 24 jam lalu: tetap tampil di "Laporan kerusakan" supaya hasilnya sempat terbaca
        $selesai = Penanganan::where('status', 'selesai')
            ->where('selesai_at', '>=', now()->subDay())
            ->whereIn('inventory_id', $semuaId)
            ->orderByDesc('selesai_at')
            ->get()
            ->unique('inventory_id')
            ->keyBy('inventory_id');

        $rows = $utama->map(function (Inventory $item) use ($kelengkapan, $pemakai, $penanganan, $selesai) {
            $peminjaman = $pemakai->get($item->id);

            return [
                ...$this->itemPayload($item, $penanganan, $selesai),
                'kategori' => $item->kategori?->nama,
                'nomor_penerimaan' => $peminjaman?->nomor_penerimaan,
                'tanggal_penerimaan' => $peminjaman?->tanggal_penerimaan?->format('Y-m-d'),
                // jam pencatatan serah terima (ISO 8601, diformat di browser)
                'waktu_penerimaan' => $peminjaman?->created_at?->toIso8601String(),
                'catatan' => $peminjaman?->catatan,
                // pengembalian hanya untuk barang yang statusnya dipakai (yang sedang rusak / diperbaiki ditangani admin dulu)
                'bisa_dikembalikan' => $item->status === 'dipakai',
                'kelengkapan' => $kelengkapan->get($item->id, collect())
                    ->map(fn (Inventory $k) => $this->itemPayload($k, $penanganan, $selesai))
                    ->values(),
            ];
        })->values();

        return response()->json($rows);
    }

    // GET /my/riwayat-perbaikan?page=1&per_page=2 -> perbaikan yang sudah selesai pada barang milik user, terbaru di atas.
    // "Milik user" = barang yang ia pakai saat dilaporkan, atau laporan yang ia buat sendiri
    // (pakai catatan di penanganan, bukan pemegang sekarang, jadi riwayatnya tetap ada setelah barang dikembalikan)
    public function riwayatPerbaikan(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min(max($request->integer('per_page', 2), 1), 20);

        $paginator = Penanganan::query()
            ->with('inventory:id,kode_inventory,nama,merk')
            ->where('status', 'selesai')
            ->where(fn ($q) => $q
                ->where('dilaporkan_oleh_user_id', $user->id)
                ->orWhereHas('pemakai', fn ($p) => $p->where('user_id', $user->id)))
            ->orderByDesc('selesai_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (Penanganan $p) => [
                'id' => $p->id,
                'kode_inventory' => $p->inventory?->kode_inventory,
                'nama' => $p->inventory?->nama ?: $p->inventory?->merk ?: $p->inventory?->kode_inventory,
                'jenis_label' => Penanganan::JENIS[$p->jenis_kerusakan] ?? $p->jenis_kerusakan,
                'keluhan' => $p->keluhan,
                'hasil' => $p->hasil,
                'catatan' => $p->catatan,
                'tanggal_lapor' => $p->tanggal_lapor->format('Y-m-d'),
                'lapor_at' => $p->lapor_at?->toIso8601String(),
                'tanggal_selesai' => $p->tanggal_selesai?->format('Y-m-d'),
                'selesai_at' => $p->selesai_at?->toIso8601String(),
            ]);

        return response()->json($paginator);
    }

    // ringkasan satu penanganan untuk dashboard user (waktu *_at dalam ISO 8601, jamnya diformat di browser)
    private function ringkasPenanganan(Penanganan $p): array
    {
        return [
            'id' => $p->id,
            'status' => $p->status,
            'jenis_label' => Penanganan::JENIS[$p->jenis_kerusakan] ?? $p->jenis_kerusakan,
            'tanggal_lapor' => $p->tanggal_lapor->format('Y-m-d'),
            'lapor_at' => $p->lapor_at?->toIso8601String(),
            'tanggal_selesai' => $p->tanggal_selesai?->format('Y-m-d'),
            'selesai_at' => $p->selesai_at?->toIso8601String(),
            'hasil' => $p->hasil,
        ];
    }

    // bentuk satu barang (utama atau kelengkapan) di dashboard user
    private function itemPayload(Inventory $item, Collection $penanganan, Collection $selesai): array
    {
        $terbuka = $penanganan->get($item->id);
        $baruSelesai = $selesai->get($item->id);

        return [
            'id' => $item->id,
            'kode_inventory' => $item->kode_inventory,
            'nama' => $item->nama,
            'merk' => $item->merk,
            'type' => $item->type,
            'warna' => $item->warna,
            'serial_number' => $item->serial_number,
            'foto_url' => $item->foto_url,
            'status' => $item->status,
            'penanganan' => $terbuka ? $this->ringkasPenanganan($terbuka) : null,
            'penanganan_selesai' => $baruSelesai ? $this->ringkasPenanganan($baruSelesai) : null,
            // sama dengan aturan di PenangananController: status Tersedia / Dipakai dan belum punya penanganan yang berjalan
            'bisa_dilapor' => $item->laporError() === null && $terbuka === null,
        ];
    }
}