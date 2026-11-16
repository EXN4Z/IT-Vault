<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // saat pengembalian diproses (tanggal_pengembalian cuma tanggal, ini yang menyimpan jamnya)
        Schema::table('peminjaman', function (Blueprint $table) {
            $table->timestamp('waktu_pengembalian')->nullable()->after('tanggal_pengembalian');
        });

        // peminjaman lama yang sudah kembali: updated_at = saat pengembalian diproses
        DB::table('peminjaman')
            ->whereNotNull('tanggal_pengembalian')
            ->update(['waktu_pengembalian' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('peminjaman', function (Blueprint $table) {
            $table->dropColumn('waktu_pengembalian');
        });
    }
};