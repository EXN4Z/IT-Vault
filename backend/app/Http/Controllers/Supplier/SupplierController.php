<?php

namespace App\Http\Controllers\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Imports\SupplierImport;
use App\Exports\SupplierExport;
use Maatwebsite\Excel\Excel as ExcelType;
use Maatwebsite\Excel\Facades\Excel;

class SupplierController extends Controller
{
    // GET /supplier?page=1&per_page=10&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();

        $data = Supplier::query()
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(nama) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(alamat) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(telepon) LIKE ?', [$like])
                );
            })
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json($data);
    }

    // POST /supplier
    public function store(SupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return response()->json($supplier, 201);
    }

    // PUT /supplier/{supplier}
    public function update(SupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($request->validated());

        return response()->json($supplier);
    }

    // DELETE /supplier/{supplier}
    public function destroy(Supplier $supplier): Response
    {
        $supplier->delete();

        return response()->noContent();
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'format'    => ['nullable', 'in:xlsx,csv'],
            'scope'     => ['nullable', 'in:all,filtered,page'],
            'search'    => ['nullable', 'string', 'max:100'],
            'columns'   => ['nullable', 'array'],
            'columns.*' => ['string', 'in:' . implode(',', array_keys(SupplierExport::KOLOM))],
            'page'      => ['nullable', 'integer', 'min:1'],
            'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $format = $data['format'] ?? 'xlsx';

        $export = new SupplierExport(
            columns: $data['columns'] ?? [],
            format: $format,
            scope: $data['scope'] ?? 'all',
            search: $data['search'] ?? null,
            page: (int) ($data['page'] ?? 1),
            perPage: (int) ($data['per_page'] ?? 10),
        );

        $nama = 'Data Supplier - ' . now()->locale('id')->translatedFormat('j F Y') . '.' . $format;

        return Excel::download($export, $nama, $format === 'csv' ? ExcelType::CSV : ExcelType::XLSX);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ]);

        $import = new SupplierImport;
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