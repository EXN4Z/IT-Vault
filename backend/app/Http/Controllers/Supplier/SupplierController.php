<?php

namespace App\Http\Controllers\Supplier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
}