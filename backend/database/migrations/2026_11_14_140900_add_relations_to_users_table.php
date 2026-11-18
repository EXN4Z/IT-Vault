<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// create_users hanya membuat kolom role_id, cabang_id, departemen_id, dan perusahaan_id
// (tabel referensinya belum ada saat itu); constraint-nya dipasang di sini
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete();
            $table->foreign('cabang_id')->references('id')->on('cabang')->nullOnDelete();
            $table->foreign('departemen_id')->references('id')->on('departemen')->nullOnDelete();
            $table->foreign('perusahaan_id')->references('id')->on('perusahaan')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['cabang_id']);
            $table->dropForeign(['departemen_id']);
            $table->dropForeign(['perusahaan_id']);
        });
    }
};
