<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\InventoryRequest;
use App\Models\Inventory;
use App\Models\Kategori;
use App\Models\Perusahaan;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use App\Imports\InventoryBuktiImport;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;
use App\Exports\InventoryExport;

class InventoryController extends Controller
{
    // relasi yang ikut dimuat supaya tabel bisa menampilkan namanya
    private const WITH = ['kategori:id,nama', 'perusahaan:id,nama', 'supplier:id,nama', 'parent:id,kode_inventory,nama', 'peminjam:id,name'];

    // GET /inventory?page=1&per_page=10&status=tersedia&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();
        $status = $request->string('status')->toString();

        $data = Inventory::with(self::WITH)
            ->withCount('children') // children_count > 0 = inventory ini barang utama
            ->when(in_array($status, Inventory::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(nama) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(merk) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(type) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', [$like])
                );
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($data);
    }

    // GET /inventory/options -> isi dropdown di form inventory
    public function options(): JsonResponse
    {
        return response()->json([
            'kategori' => Kategori::orderBy('nama')->get(['id', 'nama']),
            'perusahaan' => Perusahaan::orderBy('nama')->get(['id', 'nama']),
            'supplier' => Supplier::orderBy('nama')->get(['id', 'nama']),
            // hanya yang belum jadi kelengkapan, karena kelengkapan tidak boleh jadi barang utama
            'inventory' => Inventory::whereNull('parent_id')->orderBy('kode_inventory')->get(['id', 'kode_inventory', 'nama']),
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
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(kode_inventory) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(nama) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(merk) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(type) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', [$like])
                );
            })
            ->withCount('children')
            ->orderBy('kode_inventory')
            ->limit(30)
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
        $inventory->update(['parent_id' => null]);

        return response()->json($inventory->load(self::WITH)->loadCount('children'));
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
        $inventory->update($request->validated());

        return response()->json($inventory->load(self::WITH));
    }

    // DELETE /inventory/{inventory}
    public function destroy(Inventory $inventory): Response
    {
        // barang yang sedang dipinjam (juga kelengkapannya) harus dikembalikan dulu
        if ($inventory->status === 'dipinjam') {
            throw ValidationException::withMessages([
                'inventory' => 'Inventory yang sedang dipinjam tidak bisa dihapus. Kembalikan dulu.',
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
            'message'     => 'Import selesai.',
            'ditambahkan' => $ditambahkan,
            'dipulihkan'  => $dipulihkan,
            'dilewati'    => $dilewati,
            'jumlah_error' => count($errors),
            'errors'      => $errors,
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