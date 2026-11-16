<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Penanganan extends Model
{
    // jenis kerusakan: key = nilai di database, value = label di tampilan
    public const JENIS = [
        'software' => 'Software',
        'hardware' => 'Hardware',
        'tidak_berfungsi' => 'Tidak Berfungsi',
        'hancur' => 'Hancur',
        'terputus_sobek' => 'Terputus / Sobek',
    ];

    public const STATUSES = ['dilaporkan', 'diterima', 'selesai', 'dibatalkan'];

    // penanganan yang masih berjalan (barang hanya boleh punya satu)
    public const TERBUKA = ['dilaporkan', 'diterima'];

    // nama tabel ditulis eksplisit (default Laravel: "penanganans")
    protected $table = 'inventory_penanganan';

    protected $fillable = [
        'inventory_id', 'peminjaman_id', 'dilaporkan_oleh_user_id', 'diterima_oleh_user_id',
        'status', 'status_sebelum', 'jenis_kerusakan', 'keluhan', 'foto',
        'tanggal_lapor', 'lapor_at', 'tanggal_diterima', 'diterima_at', 'tanggal_selesai', 'selesai_at',
        'harga_jasa', 'biaya_komponen', 'hasil', 'no_struk', 'catatan',
    ];

    // tanggal keluar 'YYYY-MM-DD'; *_at disimpan UTC dan dikirim sebagai ISO 8601 (jam diformat di browser)
    protected $casts = [
        'tanggal_lapor' => 'date:Y-m-d',
        'tanggal_diterima' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
        'lapor_at' => 'datetime',
        'diterima_at' => 'datetime',
        'selesai_at' => 'datetime',
        'harga_jasa' => 'decimal:2',
        'biaya_komponen' => 'decimal:2',
    ];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function peminjaman(): BelongsTo
    {
        return $this->belongsTo(Peminjaman::class);
    }

    // yang melaporkan (admin atau peminjam)
    public function pelapor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dilaporkan_oleh_user_id');
    }

    // admin yang menerima untuk diperbaiki
    public function penerima(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diterima_oleh_user_id');
    }

    public function scopeTerbuka(Builder $query): Builder
    {
        return $query->whereIn('status', self::TERBUKA);
    }
}