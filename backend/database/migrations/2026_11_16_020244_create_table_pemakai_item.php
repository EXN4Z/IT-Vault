<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // jejak tiap kelengkapan di satu pemakai: tercatat pernah dipakai mengikuti barang utamanya
        Schema::create('peminjaman_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pemakai_id')->constrained('pemakai')->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
            $table->string('keterangan');
            $table->timestamp('dikembalikan_at')->nullable(); // kosong = masih ikut dipakai
            $table->boolean('dilepas')->default(false); // true = dilepas dari barang utama saat dipakai (bukan ikut kembali bersama set)
            $table->string('kondisi_kembali')->nullable();
            $table->text('catatan_kembali')->nullable();
            $table->timestamps();

            $table->index(['pemakai_id', 'inventory_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemakai_item');
    }
};
