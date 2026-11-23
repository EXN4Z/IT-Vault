<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // foto bukti kondisi barang saat dikembalikan (3 foto, path di disk 'public').
        // kosong untuk pengembalian lama, hasil import, atau yang ditutup otomatis (jual / rusak berat)
        Schema::table('pemakai', function (Blueprint $table) {
            $table->json('foto_kembali')->nullable()->after('catatan_kembali');
        });
    }

    public function down(): void
    {
        Schema::table('pemakai', function (Blueprint $table) {
            $table->dropColumn('foto_kembali');
        });
    }
};