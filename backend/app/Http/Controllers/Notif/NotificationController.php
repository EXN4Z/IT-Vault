<?php

namespace App\Http\Controllers\Notif;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // GET /notifications -> 20 notifikasi terbaru + jumlah yang belum dibaca
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = $user->notifications()
            ->where(fn ($q) => $q
                ->whereNull('read_at')
                ->orWhere('read_at', '>=', now()->subMinute()))
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? null,
                'message' => $n->data['message'] ?? '',
                'url' => $n->data['url'] ?? null,
                'silent' => (bool) ($n->data['silent'] ?? false),
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->toIso8601String(),
            ]);

        return response()->json([
            'data' => $items,
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    // POST /notifications/{id}/read
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->first()?->markAsRead();

        return response()->json(['ok' => true]);
    }

    // POST /notifications/read-all
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}