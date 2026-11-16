<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // peminjaman yang tanggal_pengembalian-nya masih kosong = sedang berjalan
        Schema::table('peminjaman', function (Blueprint $table) {
            $table->date('tanggal_pengembalian')->nullable()->after('tanggal_penerimaan');
            $table->string('kondisi_kembali')->nullable()->after('tanggal_pengembalian'); // status barang utama setelah kembali
            $table->text('catatan_kembali')->nullable()->after('kondisi_kembali');
            $table->foreignId('dikembalikan_oleh')->nullable()->after('created_by')
                ->constrained('users')->nullOnDelete(); // admin yang memproses pengembalian
        });

        // jejak tiap kelengkapan di satu peminjaman: tercatat pernah dipinjam mengikuti barang utamanya
        Schema::create('peminjaman_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('peminjaman_id')->constrained('peminjaman')->cascadeOnDelete();
            $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
            $table->string('keterangan');
            $table->timestamp('dikembalikan_at')->nullable(); // kosong = masih ikut dipinjam
            $table->boolean('dilepas')->default(false); // true = dilepas dari barang utama saat dipinjam (bukan ikut kembali bersama set)
            $table->string('kondisi_kembali')->nullable();
            $table->text('catatan_kembali')->nullable();
            $table->timestamps();

            $table->index(['peminjaman_id', 'inventory_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peminjaman_item');

        Schema::table('peminjaman', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dikembalikan_oleh');
            $table->dropColumn(['tanggal_pengembalian', 'kondisi_kembali', 'catatan_kembali']);
        });
    }
};