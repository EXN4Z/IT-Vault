<?php

namespace App\Http\Controllers\Cabang;

use App\Http\Controllers\Controller;
use App\Exports\CabangExport;
use App\Http\Requests\Cabang\CabangExportRequest;
use App\Http\Requests\Cabang\CabangImportRequest;
use App\Http\Requests\Cabang\CabangRequest;
use App\Imports\CabangImport;
use App\Models\Cabang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Excel as ExcelType;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CabangController extends Controller
{
    // GET /cabang?page=1&per_page=10&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);

        $data = Cabang::query()
            ->search($request->string('search')->toString())
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json($data);
    }

    // GET /cabang/export?format=xlsx&scope=all&columns[]=nama&columns[]=alamat
    // scope: all = semua data | filtered = sesuai `search` | page = satu halaman (`page` + `per_page`)
    public function export(CabangExportRequest $request): BinaryFileResponse
    {
        $scope = $request->validated('scope');
        $format = $request->validated('format');

        $query = Cabang::query()->orderBy('id');

        // filter pencarian hanya berlaku untuk "filtered" dan "page"
        if ($scope !== 'all') {
            $query->search($request->string('search')->toString());
        }

        // "page": ambil baris yang sama persis dengan yang tampil di tabel
        if ($scope === 'page') {
            $query->forPage($request->integer('page'), $request->integer('per_page'));
        }

        $writer = $format === 'csv' ? ExcelType::CSV : ExcelType::XLSX;
        $filename = 'cabang-'.now()->format('Y-m-d').'.'.$format;

        return Excel::download(new CabangExport($query, $request->validated('columns')), $filename, $writer);
    }

    // POST /cabang/import (multipart, field `file`)
    // semua baris valid -> disimpan semua; ada yang bermasalah -> 422 dan tidak ada yang disimpan
    public function import(CabangImportRequest $request): JsonResponse
    {
        $import = new CabangImport;
        Excel::import($import, $request->file('file'));

        if ($import->errors) {
            return response()->json([
                'message' => 'Import dibatalkan. Perbaiki baris berikut lalu coba lagi.',
                'errors' => ['file' => $import->errors],
            ], 422);
        }

        return response()->json(['imported' => $import->imported]);
    }

    // POST /cabang
    public function store(CabangRequest $request): JsonResponse
    {
        $cabang = Cabang::create($request->validated());

        return response()->json($cabang, 201);
    }

    // PUT /cabang/{cabang}
    public function update(CabangRequest $request, Cabang $cabang): JsonResponse
    {
        $cabang->update($request->validated());

        return response()->json($cabang);
    }

    // DELETE /cabang/{cabang}
    public function destroy(Cabang $cabang): Response
    {
        $cabang->delete();

        return response()->noContent();
    }
}