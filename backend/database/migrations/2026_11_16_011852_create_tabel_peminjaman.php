<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // riwayat serah terima: satu baris per penyerahan barang utama (kelengkapan ikut barang utamanya)
        Schema::create('peminjaman', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_id')->constrained('inventory')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete(); // karyawan peminjam
            $table->string('nomor_penerimaan')->unique();
            $table->date('tanggal_penerimaan');
            $table->text('catatan')->nullable();
            $table->json('foto'); // 3 path foto bukti di disk 'public'
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); // admin yang menyerahkan
            $table->timestamps();
        });

        // peminjam saat ini; barang utama dan semua kelengkapannya diisi peminjam yang sama
        Schema::table('inventory', function (Blueprint $table) {
            $table->foreignId('peminjam_id')->nullable()->after('status')
                ->constrained('users')->nullOnDelete();
        });

        // status "dipakai" diganti "dipinjam"
        DB::table('inventory')->where('status', 'dipakai')->update(['status' => 'dipinjam']);
    }

    public function down(): void
    {
        DB::table('inventory')->where('status', 'dipinjam')->update(['status' => 'dipakai']);

        Schema::table('inventory', function (Blueprint $table) {
            $table->dropConstrainedForeignId('peminjam_id');
        });

        Schema::dropIfExists('peminjaman');
    }
};