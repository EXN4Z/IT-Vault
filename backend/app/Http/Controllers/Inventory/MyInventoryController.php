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

        $rows = $utama->map(function (Inventory $item) use ($kelengkapan, $pemakai, $penanganan) {
            $peminjaman = $pemakai->get($item->id);

            return [
                ...$this->itemPayload($item, $penanganan),
                'kategori' => $item->kategori?->nama,
                'nomor_penerimaan' => $peminjaman?->nomor_penerimaan,
                'tanggal_penerimaan' => $peminjaman?->tanggal_penerimaan?->format('Y-m-d'),
                'catatan' => $peminjaman?->catatan,
                // pengembalian hanya untuk barang yang statusnya dipakai (yang sedang rusak / diperbaiki ditangani admin dulu)
                'bisa_dikembalikan' => $item->status === 'dipakai',
                'kelengkapan' => $kelengkapan->get($item->id, collect())
                    ->map(fn (Inventory $k) => $this->itemPayload($k, $penanganan))
                    ->values(),
            ];
        })->values();

        return response()->json($rows);
    }

    // bentuk satu barang (utama atau kelengkapan) di dashboard user
    private function itemPayload(Inventory $item, Collection $penanganan): array
    {
        $terbuka = $penanganan->get($item->id);

        return [
            'id' => $item->id,
            'kode_inventory' => $item->kode_inventory,
            'nama' => $item->nama,
            'merk' => $item->merk,
            'type' => $item->type,
            'warna' => $item->warna,
            'serial_number' => $item->serial_number,
            'status' => $item->status,
            'penanganan' => $terbuka ? [
                'id' => $terbuka->id,
                'status' => $terbuka->status,
                'jenis_label' => Penanganan::JENIS[$terbuka->jenis_kerusakan] ?? $terbuka->jenis_kerusakan,
                'tanggal_lapor' => $terbuka->tanggal_lapor->format('Y-m-d'),
            ] : null,
            // sama dengan aturan di PenangananController: belum dijual dan belum punya penanganan yang berjalan
            'bisa_dilapor' => $item->status !== 'dijual' && $terbuka === null,
        ];
    }
}
