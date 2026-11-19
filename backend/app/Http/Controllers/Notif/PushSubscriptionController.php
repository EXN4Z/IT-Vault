<?php

namespace App\Http\Controllers\Notif;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class PushSubscriptionController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|url',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string',
            'contentEncoding' => 'nullable|string',
        ]);

        $request->user()->updatePushSubscription(
            $data['endpoint'],
            $data['keys']['p256dh'],
            $data['keys']['auth'],
            $data['contentEncoding'] ?? 'aesgcm',
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request)
    {
        $request->validate(['endpoint' => 'required|url']);
        $request->user()->deletePushSubscription($request->endpoint);

        return response()->json(['ok' => true]);
    }
}
