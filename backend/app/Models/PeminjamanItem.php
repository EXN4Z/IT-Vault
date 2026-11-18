<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// satu kelengkapan di satu pemakai (kelengkapan ikut dipinjam otomatis bersama barang utamanya)
class PeminjamanItem extends Model
{
    public const KETERANGAN_IKUT = 'Terpinjam otomatis mengikuti barang utama';
    public const CATATAN_DILEPAS = 'Dikembalikan otomatis, kelengkapan dilepas dari induk oleh admin';
    public const CATATAN_DIPINDAH = 'Dilepas dari induk dan dipasang ke barang utama lain oleh admin';

    protected $table = 'peminjaman_item';

    protected $fillable = [
        'pemakai_id', 'inventory_id', 'keterangan', 'dikembalikan_at',
        'dilepas', 'kondisi_kembali', 'catatan_kembali',
    ];

    protected $casts = [
        'dikembalikan_at' => 'datetime',
        'dilepas' => 'boolean',
    ];

    public function pemakai(): BelongsTo
    {
        return $this->belongsTo(Pemakai::class);
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    // kelengkapan mulai ikut dipinjam (dicatat sekali; kalau sudah ada yang masih terbuka, tidak dobel)
    public static function buka(Pemakai $pemakai, int $inventoryId): void
    {
        $sudahAda = self::where('pemakai_id', $pemakai->id)
            ->where('inventory_id', $inventoryId)
            ->whereNull('dikembalikan_at')
            ->exists();

        if (! $sudahAda) {
            self::create([
                'pemakai_id' => $pemakai->id,
                'inventory_id' => $inventoryId,
                'keterangan' => self::KETERANGAN_IKUT,
            ]);
        }
    }

    // kelengkapan dilepas dari barang utama saat masih dipinjam
    public static function lepas(Pemakai $pemakai, int $inventoryId, ?string $kondisi, bool $pindah): void
    {
        self::where('pemakai_id', $pemakai->id)
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