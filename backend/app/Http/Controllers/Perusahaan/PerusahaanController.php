<?php

namespace App\Http\Controllers\Perusahaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perusahaan\PerusahaanRequest;
use App\Models\Perusahaan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelType;
use App\Imports\PerusahaanImport;
use App\Exports\PerusahaanExport;

class PerusahaanController extends Controller
{
    // GET /perusahaan?page=1&per_page=10&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();

        $data = Perusahaan::query()
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

    // POST /perusahaan
    public function store(PerusahaanRequest $request): JsonResponse
    {
        $perusahaan = Perusahaan::create($request->validated());

        return response()->json($perusahaan, 201);
    }

    // PUT /perusahaan/{perusahaan}
    public function update(PerusahaanRequest $request, Perusahaan $perusahaan): JsonResponse
    {
        $perusahaan->update($request->validated());

        return response()->json($perusahaan);
    }

    // DELETE /perusahaan/{perusahaan}
    public function destroy(Perusahaan $perusahaan): Response
    {
        $perusahaan->delete();

        return response()->noContent();
    }
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ]);

        $import = new PerusahaanImport;
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
            'columns.*' => ['string', 'in:' . implode(',', array_keys(PerusahaanExport::KOLOM))],
            'ids'       => ['nullable', 'array'],
            'ids.*'     => ['integer'],
        ]);

        $format = $data['format'] ?? 'xlsx';
        $scope  = $data['scope'] ?? 'all';

        $export = new PerusahaanExport(
            columns: $data['columns'] ?? [],
            format: $format,
            search: $scope === 'filtered' ? ($data['search'] ?? null) : null,
            ids: $scope === 'page' ? ($data['ids'] ?? []) : null,
        );

        $nama = 'Data Perusahaan - ' . now()->locale('id')->translatedFormat('j F Y') . '.' . $format;

        return Excel::download($export, $nama, $format === 'csv' ? ExcelType::CSV : ExcelType::XLSX);
    }
}