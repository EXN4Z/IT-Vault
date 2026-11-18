<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // riwayat serah terima: satu baris per penyerahan barang utama ke seorang pemakai
        // (kelengkapan ikut barang utamanya, jejaknya ada di pemakai_item).
        // pemakai yang tanggal_pengembalian-nya masih kosong = sedang berjalan
        Schema::create('pemakai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete(); // karyawan pemakai

            // serah terima
            $table->string('nomor_penerimaan')->unique();
            $table->date('tanggal_penerimaan');
            $table->text('catatan')->nullable();
            $table->json('foto')->default('[]'); // path foto bukti di disk 'public' (kosong untuk data hasil import)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); // admin yang menyerahkan

            // pengembalian (kosong selama masih dipakai)
            $table->date('tanggal_pengembalian')->nullable();
            $table->timestamp('waktu_pengembalian')->nullable(); // tanggal_pengembalian hanya tanggal, ini menyimpan jamnya
            $table->string('nomor_pengembalian')->nullable()->unique();
            $table->string('kondisi_kembali')->nullable(); // status barang utama setelah kembali
            $table->text('catatan_kembali')->nullable();
            $table->foreignId('dikembalikan_oleh')->nullable()->constrained('users')->nullOnDelete(); // admin yang memproses pengembalian

            $table->timestamps();

            $table->index(['inventory_id', 'tanggal_pengembalian']); // cari pemakai yang sedang berjalan
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemakai');
    }
};
