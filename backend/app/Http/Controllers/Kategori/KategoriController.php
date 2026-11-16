<?php

namespace App\Http\Controllers\Kategori;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kategori\KategoriRequest;
use App\Models\Kategori;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
}
