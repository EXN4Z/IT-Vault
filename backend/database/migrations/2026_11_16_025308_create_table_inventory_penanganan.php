<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // penanganan kerusakan: satu baris per laporan (dilaporkan -> diterima -> selesai, atau dibatalkan)
        Schema::create('inventory_penanganan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained('inventory')->restrictOnDelete();
            // peminjaman yang sedang berjalan saat dilaporkan (kosong kalau barang tidak sedang dipinjam)
            $table->foreignId('peminjaman_id')->nullable()->constrained('peminjaman')->nullOnDelete();
            $table->foreignId('dilaporkan_oleh_user_id')->nullable()->constrained('users')->nullOnDelete(); // admin atau peminjam
            $table->foreignId('diterima_oleh_user_id')->nullable()->constrained('users')->nullOnDelete(); // admin yang menerima

            $table->string('status')->default('dilaporkan'); // dilaporkan, diterima, selesai, dibatalkan
            $table->string('status_sebelum'); // status inventory sebelum dilaporkan (untuk pembatalan)

            $table->string('jenis_kerusakan'); // software, hardware, tidak_berfungsi, hancur, terputus_sobek
            $table->text('keluhan');
            $table->string('foto'); // 1 path foto di disk 'public', wajib

            $table->date('tanggal_lapor');
            $table->dateTime('lapor_at')->nullable();
            $table->date('tanggal_diterima')->nullable();
            $table->dateTime('diterima_at')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->dateTime('selesai_at')->nullable();

            $table->decimal('harga_jasa', 12, 2)->nullable();
            $table->decimal('biaya_komponen', 12, 2)->nullable();
            $table->string('hasil')->nullable(); // berhasil, tidak_bisa_diperbaiki
            $table->string('no_struk')->nullable()->unique();
            $table->text('catatan')->nullable();

            $table->timestamps();

            $table->index(['inventory_id', 'status']);
            $table->index('status');
        });

        // satu barang hanya boleh punya satu penanganan yang masih terbuka (jaga-jaga kalau dua admin melapor bersamaan)
        DB::statement(
            "CREATE UNIQUE INDEX inventory_penanganan_satu_terbuka ON inventory_penanganan (inventory_id) WHERE status IN ('dilaporkan', 'diterima')"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_penanganan');
    }
};