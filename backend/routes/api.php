<?php

use App\Http\Controllers\Login\AuthController;
use App\Http\Controllers\Cabang\CabangController;
use App\Http\Controllers\Departemen\DepartemenController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Inventory\MyInventoryController;
use App\Http\Controllers\Kategori\KategoriController;
use App\Http\Controllers\Inventory\PeminjamanController;
use App\Http\Controllers\Laporan\LaporanFotoController;
use App\Http\Controllers\Transaksi\PenangananController;
use App\Http\Controllers\Perusahaan\PerusahaanController;
use App\Http\Controllers\Supplier\SupplierController;
use App\Http\Controllers\DataUser\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Notif\PushSubscriptionController;
use App\Http\Controllers\Notif\NotificationController;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    // =========================================================================
    // SEMUA ROLE (user dan admin)
    // =========================================================================
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // notification
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    //Webpush
    Route::post('/push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('/push-subscriptions', [PushSubscriptionController::class, 'destroy']);

    // =========================================================================
    // DASHBOARD USER: terima (lihat barang yang diserahkan), lapor kerusakan, kembalikan.
    // Route di bawah dipakai bersama admin; controller membatasi user ke barang yang sedang ia pakai.
    // =========================================================================
    Route::get('/my/inventory', [MyInventoryController::class, 'index']);
    Route::get('/my/riwayat-perbaikan', [MyInventoryController::class, 'riwayatPerbaikan']);
    Route::get('/inventory/{inventory}/struk', [PeminjamanController::class, 'struk']);
    Route::post('/inventory/{inventory}/kembalikan', [PeminjamanController::class, 'kembalikan']);
    Route::post('/inventory/{inventory}/lapor-kerusakan', [PenangananController::class, 'store']);

    // =========================================================================
    // KHUSUS ADMIN
    // =========================================================================
    Route::middleware('role:admin')->group(function () {
        // CRUD user: index, store, update, destroy
        Route::get('/users/options', [UserController::class, 'options']);
        Route::get('/users/export', [UserController::class, 'export']);
        Route::apiResource('users', UserController::class)->except('show');
        Route::post('/users/import', [UserController::class, 'import']);

        // CRUD perusahaan: index, store, update, destroy
        Route::apiResource('perusahaan', PerusahaanController::class)->except('show');
        Route::post('/perusahaan/import', [PerusahaanController::class, 'import']);
        Route::get('/perusahaan/export', [PerusahaanController::class, 'export']);

        // CRUD departemen: index, store, update, destroy
        Route::apiResource('departemen', DepartemenController::class)->except('show');
        Route::post('/departemen/import', [DepartemenController::class, 'import']);
        Route::get('/departemen/export', [DepartemenController::class, 'export']);

        // /inventory/options harus di atas apiResource supaya tidak ditabrak route /inventory/{inventory}
        Route::get('/inventory/options', [InventoryController::class, 'options']);

        // link induk-anak inventory (juga di atas apiResource)
        Route::get('/inventory/{inventory}/link-candidates', [InventoryController::class, 'linkCandidates']);
        Route::post('/inventory/{inventory}/link', [InventoryController::class, 'link']);
        Route::delete('/inventory/{inventory}/link', [InventoryController::class, 'unlink']);
        Route::get('/inventory/{inventory}/kelengkapan', [InventoryController::class, 'kelengkapan']);
        Route::post('/inventory/{inventory}/jual', [InventoryController::class, 'jual']);
        Route::post('/inventory/import', [InventoryController::class, 'import']);
        Route::post('/inventory/export', [InventoryController::class, 'export']);

        // serah terima inventory ke karyawan (juga di atas apiResource)
        Route::get('/pemakai/karyawan', [PeminjamanController::class, 'karyawan']);
        Route::post('/inventory/{inventory}/serahkan', [PeminjamanController::class, 'store']);

        // struk pengembalian dan riwayat peminjaman
        Route::get('/inventory/{inventory}/riwayat', [PeminjamanController::class, 'riwayat']);
        Route::get('/pemakai/{pemakai}/struk-pengembalian', [PeminjamanController::class, 'strukPengembalian']);

        // penanganan kerusakan: daftar untuk halaman Penanganan, terima, selesai, dan riwayat per barang
        Route::get('/penanganan', [PenangananController::class, 'index']);
        Route::post('/penanganan/{penanganan}/terima', [PenangananController::class, 'terima']);
        Route::post('/penanganan/{penanganan}/selesai', [PenangananController::class, 'selesai']);
        Route::get('/inventory/{inventory}/penanganan', [PenangananController::class, 'riwayat']);

        // laporan dokumentasi foto inventory
        Route::get('/laporan/foto-inventory', [LaporanFotoController::class, 'index']);

        // CRUD inventory: index, store, update, destroy
        Route::apiResource('inventory', InventoryController::class)->except('show');

        // CRUD kategori: index, store, update, destroy
        Route::apiResource('kategori', KategoriController::class)->except('show');
        Route::post('/kategori/import', [KategoriController::class, 'import']);
        Route::get('/kategori/export', [KategoriController::class, 'export']);

        // CRUD supplier: index, store, update, destroy
        Route::apiResource('supplier', SupplierController::class)->except('show');
        Route::post('/supplier/import', [SupplierController::class, 'import']);
        Route::get('/supplier/export', [SupplierController::class, 'export']);

        // export & import cabang
        Route::get('/cabang/export', [CabangController::class, 'export']);
        Route::post('/cabang/import', [CabangController::class, 'import']);

        // CRUD cabang: index, store, update, destroy
        Route::apiResource('cabang', CabangController::class)->except('show');
    });
});