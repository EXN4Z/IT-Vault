<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->string('kode_inventory')->unique(); // dibuat trigger database kalau kosong (lihat bawah)

            // barang utama (parent_id kosong) dan kelengkapannya (parent_id = id barang utama)
            $table->foreignId('parent_id')->nullable()
                ->constrained('inventory')
                ->nullOnDelete();
            $table->foreignId('kategori_id')
                ->constrained('kategori')
                ->restrictOnDelete();

            $table->string('nama')->nullable();
            $table->string('warna')->nullable();
            $table->string('serial_number')->nullable()->unique();
            $table->unsignedInteger('jumlah')->default(1);

            $table->date('tanggal_garansi')->nullable();
            $table->date('tanggal_input')->nullable();
            $table->date('tanggal_invoice')->nullable();
            $table->string('merk', 100)->nullable();
            $table->string('type', 100)->nullable();

            $table->foreignId('perusahaan_id')->nullable()
                ->constrained('perusahaan')
                ->nullOnDelete();
            $table->text('keterangan')->nullable();
            $table->string('foto')->nullable();

            $table->foreignId('supplier_id')->nullable()
                ->constrained('supplier')
                ->nullOnDelete();
            $table->string('no_surat_jalan')->nullable();
            $table->string('no_good_receive')->nullable();

            // tersedia, dipakai, menunggu_perbaikan, diperbaiki, rusak_berat, dijual
            $table->string('status')->default('tersedia');

            // pemakai saat ini; barang utama dan semua kelengkapannya diisi pemakai yang sama
            $table->foreignId('pemakai_saat_ini_id')->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
        });

        // Auto-generate kode_inventory format: IT-{YY}-{nomor 5 digit}, mis. IT-26-00027.
        // Hanya jalan kalau kode_inventory kosong; kode yang dikirim (mis. dari import) dipakai apa adanya.
        DB::unprepared(<<<'SQL'
            create or replace function generate_kode_inventory()
            returns trigger as $$
            declare
              tahun text;
              next_number integer;
              lock_key bigint;
            begin
              if new.kode_inventory is not null and new.kode_inventory != '' then
                return new;
              end if;

              tahun := to_char(now(), 'YY');

              lock_key := hashtext('IT' || tahun);
              perform pg_advisory_xact_lock(lock_key);

              select coalesce(max(
                substring(kode_inventory from '(\d+)$')::integer
              ), 0) + 1
              into next_number
              from inventory
              where kode_inventory like 'IT-' || tahun || '-%';

              new.kode_inventory := 'IT-' || tahun || '-' || lpad(next_number::text, 5, '0');

              return new;
            end;
            $$ language plpgsql;

            drop trigger if exists trg_generate_kode_inventory on inventory;

            create trigger trg_generate_kode_inventory
            before insert on inventory
            for each row
            execute function generate_kode_inventory();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('drop trigger if exists trg_generate_kode_inventory on inventory');
        DB::unprepared('drop function if exists generate_kode_inventory()');
        Schema::dropIfExists('inventory');
    }
};
