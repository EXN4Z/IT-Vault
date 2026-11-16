<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// satu kelengkapan di satu peminjaman (kelengkapan ikut dipinjam otomatis bersama barang utamanya)
class PeminjamanItem extends Model
{
    public const KETERANGAN_IKUT = 'Terpinjam otomatis mengikuti barang utama';
    public const CATATAN_DILEPAS = 'Dikembalikan otomatis, kelengkapan dilepas dari induk oleh admin';
    public const CATATAN_DIPINDAH = 'Dilepas dari induk dan dipasang ke barang utama lain oleh admin';

    protected $table = 'peminjaman_item';

    protected $fillable = [
        'peminjaman_id', 'inventory_id', 'keterangan', 'dikembalikan_at',
        'dilepas', 'kondisi_kembali', 'catatan_kembali',
    ];

    protected $casts = [
        'dikembalikan_at' => 'datetime',
        'dilepas' => 'boolean',
    ];

    public function peminjaman(): BelongsTo
    {
        return $this->belongsTo(Peminjaman::class);
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    // kelengkapan mulai ikut dipinjam (dicatat sekali; kalau sudah ada yang masih terbuka, tidak dobel)
    public static function buka(Peminjaman $peminjaman, int $inventoryId): void
    {
        $sudahAda = self::where('peminjaman_id', $peminjaman->id)
            ->where('inventory_id', $inventoryId)
            ->whereNull('dikembalikan_at')
            ->exists();

        if (! $sudahAda) {
            self::create([
                'peminjaman_id' => $peminjaman->id,
                'inventory_id' => $inventoryId,
                'keterangan' => self::KETERANGAN_IKUT,
            ]);
        }
    }

    // kelengkapan dilepas dari barang utama saat masih dipinjam
    public static function lepas(Peminjaman $peminjaman, int $inventoryId, ?string $kondisi, bool $pindah): void
    {
        self::where('peminjaman_id', $peminjaman->id)
            ->where('inventory_id', $inventoryId)
            ->whereNull('dikembalikan_at')
            ->update([
                'dikembalikan_at' => now(),
                'dilepas' => true,
                'kondisi_kembali' => $kondisi,
                'catatan_kembali' => $pindah ? self::CATATAN_DIPINDAH : self::CATATAN_DILEPAS,
            ]);
    }
}