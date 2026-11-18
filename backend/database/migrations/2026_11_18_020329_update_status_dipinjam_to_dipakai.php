<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('inventory')
            ->where('status', 'dipinjam')
            ->update(['status' => 'dipakai']);
    }

    public function down(): void
    {
        DB::table('inventory')
            ->where('status', 'dipakai')
            ->update(['status' => 'dipinjam']);
    }
};