<?php

namespace App\Http\Controllers\Laporan;

use App\Http\Controllers\Controller;
use App\Models\Pemakai;
use App\Models\Penanganan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LaporanFotoController extends Controller
{
    // GET /api/laporan/foto-inventory?jenis=semua|pemakai|pengembalian|rusak&search=
    public function index(Request $request): JsonResponse
    {
        $jenis = $request->string('jenis')->toString();
        $search = $request->string('search')->trim()->lower()->toString();

        $items = collect();

        // 1. Ambil foto dari transaksi Pemakai (Serah Terima)
        if ($jenis === '' || $jenis === 'semua' || $jenis === 'pemakai') {
            $peminjamanQuery = Pemakai::with([
                'inventory:id,kode_inventory,nama,merk,type,warna',
                'user:id,name,nik',
            ])
                ->whereNotNull('foto')
                ->when($search !== '', function ($q) use ($search) {
                    $like = '%'.$search.'%';
                    $q->where(fn ($w) => $w
                        ->whereRaw('LOWER(nomor_penerimaan) LIKE ?', [$like])
                        ->orWhereHas('inventory', fn ($i) => $i
                            ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(nama) LIKE ?', [$like]))
                        ->orWhereHas('user', fn ($u) => $u->whereRaw('LOWER(name) LIKE ?', [$like]))
                    );
                })
                ->latest('id')
                ->get();

            foreach ($peminjamanQuery as $p) {
                $fotos = is_array($p->foto) ? array_values(array_filter($p->foto)) : [];
                if (count($fotos) === 0) {
                    continue;
                }

                $items->push([
                    'id' => 'pinjam-'.$p->id,
                    'jenis' => 'pemakai',
                    'jenis_label' => 'Pemakai',
                    'referensi' => $p->nomor_penerimaan,
                    'tanggal' => $p->tanggal_penerimaan?->format('Y-m-d'),
                    'waktu' => $p->created_at?->toIso8601String(),
                    'sort_at' => $p->created_at?->timestamp ?? 0,
                    'pelaku' => $p->user?->name ?? '-',
                    'keterangan' => $p->catatan,
                    'inventory' => $p->inventory ? [
                        'id' => $p->inventory->id,
                        'kode_inventory' => $p->inventory->kode_inventory,
                        'nama' => $p->inventory->nama,
                        'merk' => $p->inventory->merk,
                        'type' => $p->inventory->type,
                    ] : null,
                    'foto_urls' => array_map(fn ($path) => Storage::disk('public')->url($path), $fotos),
                ]);
            }
        }

        // 2. Ambil foto dari transaksi Penanganan Kerusakan
        if ($jenis === '' || $jenis === 'semua' || $jenis === 'rusak') {
            $penangananQuery = Penanganan::with([
                'inventory:id,kode_inventory,nama,merk,type,warna',
                'pelapor:id,name',
            ])
                ->whereNotNull('foto')
                ->where('foto', '!=', '')
                ->when($search !== '', function ($q) use ($search) {
                    $like = '%'.$search.'%';
                    $q->where(fn ($w) => $w
                        ->whereRaw('LOWER(keluhan) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(no_struk, \'\')) LIKE ?', [$like])
                        ->orWhereHas('inventory', fn ($i) => $i
                            ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(nama) LIKE ?', [$like]))
                        ->orWhereHas('pelapor', fn ($u) => $u->whereRaw('LOWER(name) LIKE ?', [$like]))
                    );
                })
                ->latest('id')
                ->get();

            foreach ($penangananQuery as $pn) {
                $items->push([
                    'id' => 'rusak-'.$pn->id,
                    'jenis' => 'rusak',
                    'jenis_label' => 'Kerusakan',
                    'referensi' => $pn->no_struk ?? ('LPR-'.$pn->id),
                    'tanggal' => $pn->tanggal_lapor?->format('Y-m-d'),
                    'waktu' => $pn->lapor_at?->toIso8601String(),
                    'sort_at' => $pn->lapor_at?->timestamp ?? $pn->created_at?->timestamp ?? 0,
                    'pelaku' => $pn->pelapor?->name ?? '-',
                    'keterangan' => $pn->keluhan,
                    'inventory' => $pn->inventory ? [
                        'id' => $pn->inventory->id,
                        'kode_inventory' => $pn->inventory->kode_inventory,
                        'nama' => $pn->inventory->nama,
                        'merk' => $pn->inventory->merk,
                        'type' => $pn->inventory->type,
                    ] : null,
                    'foto_urls' => [Storage::disk('public')->url($pn->foto)],
                ]);
            }
        }

        // Urutkan dari transaksi terbaru
        $sorted = $items->sortByDesc('sort_at')->values()->map(function ($row) {
            unset($row['sort_at']);
            return $row;
        });

        return response()->json($sorted);
    }
}