<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// pembatas akses per role; dipakai di routes/api.php sebagai ->middleware('role:admin')
// user tanpa role (role_id kosong) dianggap tidak punya akses ke route yang dibatasi
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $nama = $request->user()?->role?->nama;

        if ($nama === null || ! in_array($nama, $roles, true)) {
            return response()->json([
                'message' => 'Kamu tidak punya akses ke fitur ini.',
            ], 403);
        }

        return $next($request);
    }
}
