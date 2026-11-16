<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Isi tabel roles dengan 2 role bawaan: user (id 1) dan admin (id 2).
     * Urutan penting: di tabel kosong, id diberikan otomatis sesuai urutan ini.
     * updateOrInsert dipakai supaya seeder aman dijalankan berulang (tidak bikin data ganda).
     */
    public function run(): void
    {
        $now = now();

        foreach (['user', 'admin'] as $nama) {
            DB::table('roles')->updateOrInsert(
                ['nama' => $nama],
                ['created_at' => $now, 'updated_at' => $now],
            );
        }
    }
}
