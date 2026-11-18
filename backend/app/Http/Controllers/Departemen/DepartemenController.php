<?php

namespace App\Http\Controllers\Departemen;

use App\Http\Controllers\Controller;
use App\Http\Requests\Departemen\DepartemenRequest;
use App\Models\Departemen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Imports\DepartemenImport;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\DepartemenExport;
use Maatwebsite\Excel\Excel as ExcelType;

class DepartemenController extends Controller
{
    // GET /departemen?page=1&per_page=10&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();

        $data = Departemen::query()
            ->when($search !== '', fn ($q) => $q->whereRaw('LOWER(nama) LIKE ?', ['%'.$search.'%']))
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json($data);
    }

    // POST /departemen
    public function store(DepartemenRequest $request): JsonResponse
    {
        $departemen = Departemen::create($request->validated());

        return response()->json($departemen, 201);
    }

    // PUT /departemen/{departemen}
    public function update(DepartemenRequest $request, Departemen $departemen): JsonResponse
    {
        $departemen->update($request->validated());

        return response()->json($departemen);
    }

    // DELETE /departemen/{departemen}
    public function destroy(Departemen $departemen): Response
    {
        $departemen->delete();

        return response()->noContent();
    }
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ]);

        $import = new DepartemenImport;
        Excel::import($import, $request->file('file'));

        return response()->json([
            'message'      => 'Import selesai.',
            'ditambahkan'  => $import->ditambahkan,
            'dipulihkan'   => $import->dipulihkan,
            'dilewati'     => $import->dilewati,
            'jumlah_error' => count($import->errors),
            'errors'       => $import->errors,
        ]);
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format'    => ['nullable', 'in:xlsx,csv'],
            'scope'     => ['nullable', 'in:all,filtered,page'],
            'search'    => ['nullable', 'string', 'max:100'],
            'columns'   => ['nullable', 'array'],
            'columns.*' => ['string', 'in:' . implode(',', array_keys(DepartemenExport::KOLOM))],
            'page'      => ['nullable', 'integer', 'min:1'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $format = $data['format'] ?? 'xlsx';

        $export = new DepartemenExport(
            columns: $data['columns'] ?? [],
            format: $format,
            scope: $data['scope'] ?? 'all',
            search: $data['search'] ?? null,
            page: (int) ($data['page'] ?? 1),
            perPage: (int) ($data['per_page'] ?? 10),
        );

        $nama = 'Data Departemen - ' . now()->locale('id')->translatedFormat('j F Y') . '.' . $format;

        return Excel::download($export, $nama, $format === 'csv' ? ExcelType::CSV : ExcelType::XLSX);
    }
}