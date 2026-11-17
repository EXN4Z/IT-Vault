<?php

namespace App\Http\Controllers\Perusahaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perusahaan\PerusahaanRequest;
use App\Models\Perusahaan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\PerusahaanImport;

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
    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ]);

        Excel::import(new PerusahaanImport, $request->file('file'));

        return back()->with('success', 'Data perusahaan berhasil diimport.');
    }
}