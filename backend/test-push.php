<?php

use App\Models\Penanganan;
use App\Models\User;
use App\Notifications\InventoryKerusakanDilaporkan;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Support\Facades\Event;

Event::listen(NotificationFailed::class, function ($e) {
    $r = $e->data['report'] ?? null;
    dump($r ? $r->getReason() : $e->data);
});

$penanganan = Penanganan::latest()->first();
$user = User::find(1); // GANTI 1 dengan ID user yang sudah klik tombol Notifikasi

dump('jumlah subscription: ' . $user->pushSubscriptions()->count());
dump('id penerima: ' . $user->id . ', id pelapor: ' . $penanganan->dilaporkan_oleh_user_id);

$user->notify(new InventoryKerusakanDilaporkan($penanganan, 'Tes Pelapor'));

dump('selesai dikirim');