<?php

use App\Http\Controllers\Login\AuthController;
use App\Http\Controllers\Cabang\CabangController;
use App\Http\Controllers\Departemen\DepartemenController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Kategori\KategoriController;
use App\Http\Controllers\Inventory\PeminjamanController;
use App\Http\Controllers\Transaksi\PenangananController;
use App\Http\Controllers\Perusahaan\PerusahaanController;
use App\Http\Controllers\Supplier\SupplierController;
use App\Http\Controllers\DataUser\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // CRUD user: index, store, update, destroy
    // /users/options dan /users/export harus di atas apiResource supaya tidak ditabrak route /users/{user}
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
    Route::get('/peminjaman/karyawan', [PeminjamanController::class, 'karyawan']);
    Route::post('/inventory/{inventory}/serahkan', [PeminjamanController::class, 'store']);
    Route::get('/inventory/{inventory}/struk', [PeminjamanController::class, 'struk']);

    // pengembalian, struk pengembalian, dan riwayat peminjaman
    Route::post('/inventory/{inventory}/kembalikan', [PeminjamanController::class, 'kembalikan']);
    Route::get('/inventory/{inventory}/riwayat', [PeminjamanController::class, 'riwayat']);
    Route::get('/peminjaman/{peminjaman}/struk-pengembalian', [PeminjamanController::class, 'strukPengembalian']);

    // penanganan kerusakan: daftar untuk halaman Penanganan, lapor, dan riwayat per barang (juga di atas apiResource)
    Route::get('/penanganan', [PenangananController::class, 'index']);
    Route::post('/penanganan/{penanganan}/terima', [PenangananController::class, 'terima']);
    Route::post('/penanganan/{penanganan}/selesai', [PenangananController::class, 'selesai']);
    Route::get('/inventory/{inventory}/penanganan', [PenangananController::class, 'riwayat']);
    Route::post('/inventory/{inventory}/lapor-kerusakan', [PenangananController::class, 'store']);

    // CRUD inventory: index, store, update, destroy
    Route::apiResource('inventory', InventoryController::class)->except('show');

    // CRUD kategori: index, store, update, destroy
    Route::apiResource('kategori', KategoriController::class)->except('show');

    // CRUD supplier: index, store, update, destroy
    Route::apiResource('supplier', SupplierController::class)->except('show');

    // export cabang (xlsx / csv); ditaruh di atas apiResource, sama seperti /users/options
    Route::get('/cabang/export', [CabangController::class, 'export']);

    // import cabang (xlsx / xls / csv); juga di atas apiResource
    Route::post('/cabang/import', [CabangController::class, 'import']);

    // CRUD cabang: index, store, update, destroy
    Route::apiResource('cabang', CabangController::class)->except('show');
});