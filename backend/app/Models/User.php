<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasPushSubscriptions;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role_id',
        'cabang_id',
        'nik',
        'departemen_id',
        'tanggal_masuk',
        'perusahaan_id',
        'status',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'tanggal_masuk' => 'date',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class);
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class);
    }

    public function departemen(): BelongsTo
    {
        return $this->belongsTo(Departemen::class);
    }

    // pencarian nama / email / NIK / role / status; dipakai bersama oleh index dan export
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = mb_strtolower(trim($term));

        if ($term === '') {
            return $query;
        }

        $like = '%'.$term.'%';

        // status dicocokkan dari awal kata (min. 3 huruf) dan bukan "mengandung",
        // karena "aktif" ada di dalam "nonaktif" -> mengetik "aktif" tidak ikut memunculkan user nonaktif
        $status = null;
        if (mb_strlen($term) >= 3) {
            if (str_starts_with('nonaktif', $term) || in_array($term, ['non aktif', 'non-aktif', 'tidak aktif'], true)) {
                $status = 'nonaktif';
            } elseif (str_starts_with('aktif', $term)) {
                $status = 'aktif';
            }
        }

        return $query->where(fn ($w) => $w
            ->whereRaw('LOWER(name) LIKE ?', [$like])
            ->orWhereRaw('LOWER(email) LIKE ?', [$like])
            ->orWhereRaw('LOWER(nik) LIKE ?', [$like])
            ->orWhereHas('role', fn ($r) => $r->whereRaw('LOWER(nama) LIKE ?', [$like]))
            ->when($status, fn ($q) => $q->orWhere('status', $status))
        );
    }

    // filter tab role (user / admin); kosong = semua
    public function scopeFilterRole(Builder $query, string $role): Builder
    {
        $role = mb_strtolower(trim($role));

        if ($role === '') {
            return $query;
        }

        return $query->whereHas('role', fn ($r) => $r->whereRaw('LOWER(nama) = ?', [$role]));
    }

    // aturan nonaktifkan: karyawan yang masih memegang inventory harus mengembalikannya dulu
    // (cukup barang utama yang disebut: kelengkapan ikut barang utamanya)
    // return pesan error, atau null kalau boleh
    public function nonaktifError(): ?string
    {
        $dipegang = Inventory::where('pemakai_saat_ini_id', $this->id)->orderBy('kode_inventory');

        if (! $dipegang->exists()) {
            return null;
        }

        $kode = (clone $dipegang)->whereNull('parent_id')->pluck('kode_inventory');

        return $kode->isEmpty()
            ? 'Kembalikan inventory terlebih dahulu.'
            : "Kembalikan inventory terlebih dahulu: {$kode->implode(', ')}.";
    }
}