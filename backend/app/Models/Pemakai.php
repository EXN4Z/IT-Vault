<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pemakai extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "peminjamen")
    protected $table = 'pemakai';

    protected $fillable = [
        'inventory_id', 'user_id', 'nomor_penerimaan', 'tanggal_penerimaan',
        'catatan', 'foto', 'created_by', 'nomor_pengembalian',
        'tanggal_pengembalian', 'waktu_pengembalian', 'kondisi_kembali', 'catatan_kembali', 'dikembalikan_oleh',
    ];

    protected $casts = [
        'tanggal_penerimaan' => 'date:Y-m-d',
        'tanggal_pengembalian' => 'date:Y-m-d',
        'waktu_pengembalian' => 'datetime',
        'foto' => 'array',
    ];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    // karyawan peminjam
    public function peminjam(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // kelengkapan yang tercatat ikut dipinjam
    public function items(): HasMany
    {
        return $this->hasMany(PeminjamanItem::class);
    }

    // pemakai yang sedang berjalan (belum dikembalikan)
    public function scopeAktif(Builder $query): Builder
    {
        return $query->whereNull('tanggal_pengembalian');
    }

    public function sudahKembali(): bool
    {
        return $this->tanggal_pengembalian !== null;
    }
}