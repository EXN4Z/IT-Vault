<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Bikin 1 akun admin awal. Login bisa pakai email ATAU nama.
     * firstOrCreate: aman dijalankan berulang, akun yang sudah ada tidak ditimpa
     * (password yang sudah diganti tidak ikut ke-reset).
     * Password di-hash otomatis oleh cast 'hashed' di model User.
     */
    public function run(): void
    {
        $role = Role::firstOrCreate(['nama' => 'admin']);

        User::firstOrCreate(
            ['email' => 'admin@itvault.com'],
            [
                'name' => 'Admin IT',
                'password' => 'admin12345',
                'role_id' => $role->id,
                'status' => 'aktif',
                'tanggal_masuk' => now()->toDateString(),
            ],
        );
    }
}