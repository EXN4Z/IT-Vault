<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\InventoryRequest;
use App\Models\Inventory;
use App\Models\Kategori;
use App\Models\Peminjaman;
use App\Models\Perusahaan;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Imports\InventoryBuktiImport;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;
use App\Exports\InventoryExport;

class InventoryController extends Controller
{
    // relasi yang ikut dimuat supaya tabel bisa menampilkan namanya
    private const WITH = ['kategori:id,nama', 'perusahaan:id,nama', 'supplier:id,nama', 'parent:id,kode_inventory,nama', 'peminjam:id,name'];

    // GET /inventory?page=1&per_page=10&status=tersedia&search=...&sort_by=kode_inventory&sort_dir=asc
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();
        $status = $request->string('status')->toString();

        // kolom yang diizinkan untuk sorting
        $allowedSorts = ['kode_inventory', 'nama', 'kategori', 'merk', 'jumlah', 'link', 'peminjam', 'status'];
        $requestedSort = $request->string('sort_by')->toString();
        $sortBy = in_array($requestedSort, $allowedSorts, true) ? $requestedSort : 'kode_inventory';
        $sortDir = $request->string('sort_dir')->lower()->toString() === 'desc' ? 'desc' : 'asc';

        $query = Inventory::with(self::WITH)
            ->withCount('children') // children_count > 0 = inventory ini barang utama
            ->when(in_array($status, Inventory::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(nama) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(merk) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(type) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(CONCAT_WS(' ', merk, type)) LIKE ?", [$like])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', [$like])
                    ->orWhereHas('kategori', fn ($k) => $k->whereRaw('LOWER(nama) LIKE ?', [$like]))
                    ->orWhereHas('peminjam', fn ($p) => $p->whereRaw('LOWER(name) LIKE ?', [$like]))
                );
            });

        // terapkan sorting (kolom relasi pakai subquery agar tidak bentrok dengan paginate)
        match ($sortBy) {
            'kategori' => $query
                ->orderByRaw('kategori_id IS NULL ASC')
                ->orderBy(
                    Kategori::select('nama')->whereColumn('kategori.id', 'inventory.kategori_id'),
                    $sortDir
                ),
            'peminjam' => $query
                ->orderByRaw('peminjam_id IS NULL ASC')
                ->orderBy(
                    DB::table('users')->select('name')->whereColumn('users.id', 'inventory.peminjam_id'),
                    $sortDir
                ),
            'link' => $query
                ->orderByRaw('(parent_id IS NULL AND NOT EXISTS (SELECT 1 FROM inventory AS c WHERE c.parent_id = inventory.id)) ASC')
                ->orderBy(
                    DB::table('inventory as parent_inv')->select('kode_inventory')->whereColumn('parent_inv.id', 'inventory.parent_id'),
                    $sortDir
                )
                ->orderBy('children_count', $sortDir),
            default => $query->orderBy($sortBy, $sortDir),
        };

        return response()->json($query->paginate($perPage));
    }

    // GET /inventory/options -> isi dropdown di form inventory
    public function options(): JsonResponse
    {
        return response()->json([
            'kategori' => Kategori::orderBy('nama')->get(['id', 'nama']),
            'perusahaan' => Perusahaan::orderBy('nama')->get(['id', 'nama']),
            'supplier' => Supplier::orderBy('nama')->get(['id', 'nama']),
            // hanya yang belum jadi kelengkapan (kelengkapan tidak boleh jadi barang utama) dan belum dijual
            'inventory' => Inventory::whereNull('parent_id')->where('status', '!=', 'dijual')->orderBy('kode_inventory')->get(['id', 'kode_inventory', 'nama']),
        ]);
    }

    // GET /inventory/{inventory}/link-candidates?search=... -> pilihan barang utama di modal Link
    // yang muncul: bukan dirinya sendiri dan belum jadi kelengkapan
    public function linkCandidates(Request $request, Inventory $inventory): JsonResponse
    {
        $search = $request->string('search')->trim()->lower()->toString();

        $data = Inventory::query()
            ->whereKeyNot($inventory->id)
            ->whereNull('parent_id')
            ->where('status', '!=', 'dijual') // yang sudah dijual tidak bisa jadi barang utama
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(nama) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(merk) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(type) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(CONCAT_WS(' ', merk, type)) LIKE ?", [$like])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', [$like])
                );
            })
            ->withCount('children')
            ->orderBy('kode_inventory')
            ->get(['id', 'kode_inventory', 'nama', 'merk', 'type']);

        return response()->json($data);
    }

    // POST /inventory/{inventory}/link  { parent_id } -> jadikan inventory ini kelengkapan dari parent_id
    public function link(Request $request, Inventory $inventory): JsonResponse
    {
        $validated = $request->validate([
            'parent_id' => ['required', 'integer', 'exists:inventory,id'],
        ], [
            'parent_id.required' => 'Pilih barang utama dulu.',
            'parent_id.exists' => 'Barang utama tidak ditemukan.',
        ]);

        $parent = Inventory::findOrFail($validated['parent_id']);

        // linkError sudah menolak kalau inventory ini atau barang utamanya sudah dijual
        $error = $inventory->linkError($parent);
        if ($error) {
            throw ValidationException::withMessages(['parent_id' => $error]);
        }

        // peminjam & status kelengkapan menyesuaikan barang utamanya lewat Inventory::booted()
        $inventory->update(['parent_id' => $parent->id]);

        return response()->json($inventory->load(self::WITH)->loadCount('children'));
    }

    // DELETE /inventory/{inventory}/link -> lepas dari barang utamanya
    public function unlink(Inventory $inventory): JsonResponse
    {
        $this->ensureTidakTerkunci($inventory);

        $inventory->update(['parent_id' => null]);

        return response()->json($inventory->load(self::WITH)->loadCount('children'));
    }

    // GET /inventory/{inventory}/kelengkapan -> kelengkapan yang sedang terpasang di barang utama ini (untuk modal Detail)
    public function kelengkapan(Inventory $inventory): JsonResponse
    {
        return response()->json(
            $inventory->children()
                ->orderBy('kode_inventory')
                ->get(['id', 'kode_inventory', 'nama', 'merk', 'type', 'serial_number', 'status'])
        );
    }

    // POST /inventory/{inventory}/jual -> jual inventory: status jadi dijual, datanya tetap ada tapi terkunci.
    // Syarat: status Rusak Berat dan tidak ada kelengkapan yang masih nempel (lepas link dulu).
    // Tidak ada kaitan dengan write-off; ini murni perubahan status.
    public function jual(Request $request, Inventory $inventory): JsonResponse
    {
        DB::transaction(function () use ($request, $inventory) {
            // kunci barangnya lalu cek ulang, supaya dua admin tidak menjual (atau melepas link) bersamaan
            $locked = Inventory::lockForUpdate()->findOrFail($inventory->id);

            $error = $locked->jualError();
            if ($error) {
                throw ValidationException::withMessages(['inventory' => $error]);
            }

            // barang yang rusak berat saat dipakai masih tercatat dipegang peminjamnya dan tombol Kembalikan
            // tidak bisa dipakai lagi (hanya menerima status Dipakai), jadi peminjaman ditutup di sini
            $peminjaman = Peminjaman::aktif()->where('inventory_id', $locked->id)->latest('id')->first();

            if ($peminjaman) {
                $peminjaman->update([
                    'tanggal_pengembalian' => now()->toDateString(),
                    'waktu_pengembalian' => now(),
                    'kondisi_kembali' => 'rusak_berat',
                    'catatan_kembali' => 'Ditutup otomatis karena barang dijual',
                    'dikembalikan_oleh' => $request->user()->id,
                ]);
            }

            $locked->update(['status' => 'dijual', 'peminjam_id' => null]);
        });

        return response()->json($inventory->refresh()->load(self::WITH)->loadCount('children'));
    }

    // inventory yang sudah dijual terkunci (tidak bisa diubah, dihapus, atau di-link lagi)
    private function ensureTidakTerkunci(Inventory $inventory): void
    {
        $error = $inventory->terkunciError();

        if ($error) {
            throw ValidationException::withMessages(['inventory' => $error]);
        }
    }

    // POST /inventory
    public function store(InventoryRequest $request): JsonResponse
    {
        $inventory = Inventory::create($request->validated());

        // kode_inventory diisi trigger database, jadi baca ulang dari tabel
        return response()->json($inventory->refresh()->load(self::WITH), 201);
    }

    // PUT /inventory/{inventory}
    public function update(InventoryRequest $request, Inventory $inventory): JsonResponse
    {
        $this->ensureTidakTerkunci($inventory);

        $inventory->update($request->validated());

        return response()->json($inventory->load(self::WITH));
    }

    // DELETE /inventory/{inventory}
    public function destroy(Inventory $inventory): Response
    {
        $this->ensureTidakTerkunci($inventory);

        // barang yang sedang dipakai (juga kelengkapannya) harus dikembalikan dulu
        if ($inventory->status === 'dipakai') {
            throw ValidationException::withMessages([
                'inventory' => 'Inventory yang sedang dipakai tidak bisa dihapus. Kembalikan dulu.',
            ]);
        }

        $inventory->delete();

        return response()->noContent();
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'], // maks 10 MB
        ]);

        $import = new InventoryBuktiImport();

        try {
            Excel::import($import, $request->file('file'));
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Import gagal: ' . $e->getMessage(),
            ], 500);
        }

        $ditambahkan = $import->getRowCount();
        $dipulihkan  = $import->getJumlahDipulihkan();
        $dilewati    = $import->getJumlahDilewati();
        $errors      = $import->getErrors();

        // Tidak ada satu baris pun yang masuk (mis. header tidak ketemu)
        if ($ditambahkan === 0 && $dipulihkan === 0 && $dilewati === 0 && !empty($errors)) {
            return response()->json([
                'message' => 'Tidak ada data yang diimport.',
                'errors'  => $errors,
            ], 422);
        }

        return response()->json([
            'message'      => 'Import selesai.',
            'ditambahkan'  => $ditambahkan,
            'dipulihkan'   => $dipulihkan,
            'dilewati'     => $dilewati,
            'jumlah_error' => count($errors),
            'errors'       => $errors,
        ]);
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format'    => ['required', 'in:xlsx,csv'],
            'scope'     => ['required', 'in:all,filtered,page'],
            'columns'   => ['nullable', 'array'],
            'columns.*' => ['string'],
            'status'    => ['nullable', 'string'],
            'search'    => ['nullable', 'string'],
            'page'      => ['nullable', 'integer', 'min:1'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $nama   = 'inventory-' . now()->format('Ymd-His') . '.' . $data['format'];
        $writer = $data['format'] === 'csv' ? ExcelWriter::CSV : ExcelWriter::XLSX;

        return Excel::download(new InventoryExport($data), $nama, $writer);
    }
}