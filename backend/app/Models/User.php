<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

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

    // pencarian nama / email / NIK; dipakai bersama oleh index dan export
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = mb_strtolower(trim($term));

        if ($term === '') {
            return $query;
        }

        $like = '%'.$term.'%';

        return $query->where(fn ($w) => $w
            ->whereRaw('LOWER(name) LIKE ?', [$like])
            ->orWhereRaw('LOWER(email) LIKE ?', [$like])
            ->orWhereRaw('LOWER(nik) LIKE ?', [$like])
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
}