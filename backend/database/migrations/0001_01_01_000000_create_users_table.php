<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $tabel) {
            $tabel->id();
            $tabel->string('name');
            $tabel->string('email')->unique();
            $tabel->string('password');
            $tabel->string('phone')->nullable();

            // FK sementara nullable, constraint ditambah setelah tabel referensi dibuat
            $tabel->unsignedBigInteger('role_id')->nullable();
            $tabel->unsignedBigInteger('cabang_id')->nullable();

            $tabel->string('nik')->nullable();

            $tabel->unsignedBigInteger('departemen_id')->nullable();

            $tabel->date('tanggal_masuk')->nullable();
            $tabel->timestamps();

            $tabel->unsignedBigInteger('perusahaan_id')->nullable();

            $tabel->string('status')->default('aktif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};