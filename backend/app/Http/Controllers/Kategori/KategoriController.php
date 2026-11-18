<?php

namespace App\Http\Controllers\Kategori;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kategori\KategoriRequest;
use App\Models\Kategori;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Exports\KategoriExport;
use App\Imports\KategoriImport;
use Maatwebsite\Excel\Excel as ExcelType;
use Maatwebsite\Excel\Facades\Excel;

class KategoriController extends Controller
{
    // GET /kategori?page=1&per_page=10&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();

        $data = Kategori::query()
            ->when($search !== '', fn ($q) => $q->whereRaw('LOWER(nama) LIKE ?', ['%'.$search.'%']))
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json($data);
    }

    // POST /kategori
    public function store(KategoriRequest $request): JsonResponse
    {
        $kategori = Kategori::create($request->validated());

        return response()->json($kategori, 201);
    }

    // PUT /kategori/{kategori}
    public function update(KategoriRequest $request, Kategori $kategori): JsonResponse
    {
        $kategori->update($request->validated());

        return response()->json($kategori);
    }

    // DELETE /kategori/{kategori}
    public function destroy(Kategori $kategori): Response|JsonResponse
    {
        try {
            $kategori->delete();
        } catch (QueryException $e) {
            // 23503 = foreign key violation: kategori masih dipakai inventory (restrictOnDelete)
            if ($e->getCode() === '23503') {
                return response()->json(['message' => 'Kategori masih dipakai inventory, tidak bisa dihapus.'], 409);
            }

            throw $e;
        }

        return response()->noContent();
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format'    => ['nullable', 'in:xlsx,csv'],
            'scope'     => ['nullable', 'in:all,filtered,page'],
            'search'    => ['nullable', 'string', 'max:100'],
            'columns'   => ['nullable', 'array'],
            'columns.*' => ['string', 'in:' . implode(',', array_keys(KategoriExport::KOLOM))],
            'page'      => ['nullable', 'integer', 'min:1'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $format = $data['format'] ?? 'xlsx';

        $export = new KategoriExport(
            format: $format,
            scope: $data['scope'] ?? 'all',
            search: $data['search'] ?? null,
            page: (int) ($data['page'] ?? 1),
            perPage: (int) ($data['per_page'] ?? 10),
        );

        $nama = 'Data Kategori - ' . now()->locale('id')->translatedFormat('j F Y') . '.' . $format;

        return Excel::download($export, $nama, $format === 'csv' ? ExcelType::CSV : ExcelType::XLSX);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ]);

        $import = new KategoriImport;
        Excel::import($import, $request->file('file'));

        return response()->json([
            'message'      => 'Import selesai.',
            'ditambahkan'  => $import->ditambahkan,
            'dilewati'     => $import->dilewati,
            'jumlah_error' => count($import->errors),
            'errors'       => $import->errors,
        ]);
    }
}
