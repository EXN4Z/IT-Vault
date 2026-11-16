<?php

namespace App\Http\Controllers\DataUser;

use App\Http\Controllers\Controller;
use App\Http\Requests\DataUser\UserRequest;
use App\Models\Cabang;
use App\Models\Departemen;
use App\Models\Perusahaan;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserController extends Controller
{
    // GET /users?page=1&per_page=10&role=user|admin&search=...
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 10), 100);
        $search = $request->string('search')->trim()->lower()->toString();

        $users = User::with('role:id,nama')
            ->when($request->filled('role'), function ($q) use ($request) {
                $role = $request->string('role')->lower()->toString();

                $q->whereHas('role', fn ($r) =>
                    $r->whereRaw('LOWER(nama) = ?', [$role])
                );
            })
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';

                $q->where(fn ($w) => $w
                    ->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(nik) LIKE ?', [$like])
                );
            })
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json($users);
    }

    // GET /users/options -> isi dropdown di form user
    public function options(): JsonResponse
    {
        return response()->json([
            'roles' => Role::orderBy('id')->get(['id', 'nama']),
            'perusahaan' => Perusahaan::orderBy('nama')->get(['id', 'nama']),
            'cabang' => Cabang::orderBy('nama')->get(['id', 'nama']),
            'departemen' => Departemen::orderBy('nama')->get(['id', 'nama']),
        ]);
    }

    // POST /users
    public function store(UserRequest $request): JsonResponse
    {
        // password di-hash otomatis lewat cast 'hashed' di model User
        $user = User::create($request->validated());

        return response()->json($user->load('role:id,nama'), 201);
    }

    // PUT /users/{user}
    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        // password kosong = tidak diganti
        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json($user->load('role:id,nama'));
    }

    // DELETE /users/{user}
    public function destroy(Request $request, User $user): JsonResponse|Response
    {
        // jangan sampai admin menghapus akunnya sendiri
        if ($request->user()->is($user)) {
            return response()->json(['message' => 'Kamu tidak bisa menghapus akunmu sendiri.'], 422);
        }

        // cabut semua token login user ini, lalu hapus
        $user->tokens()->delete();
        $user->delete();

        return response()->noContent();
    }
}