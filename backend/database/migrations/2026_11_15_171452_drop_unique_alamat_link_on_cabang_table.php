<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // alamat dan link cabang boleh sama, jadi aturan unique keduanya dibuang
    public function up(): void
    {
        Schema::table('cabang', function (Blueprint $table) {
            $table->dropUnique(['alamat']);
            $table->dropUnique(['link']);
        });
    }

    public function down(): void
    {
        Schema::table('cabang', function (Blueprint $table) {
            $table->unique('alamat');
            $table->unique('link');
        });
    }
};