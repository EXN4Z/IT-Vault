<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Cabang extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "cabangs")
    protected $table = 'cabang';

    protected $fillable = ['nama', 'alamat', 'link', 'telepon'];

    // pencarian nama / alamat / telepon (tanpa membedakan huruf besar-kecil)
    // dipakai bersama oleh daftar tabel (index) dan export, supaya hasilnya selalu sama
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = mb_strtolower(trim($term));

        if ($term === '') {
            return $query;
        }

        $like = '%'.$term.'%';

        return $query->where(fn ($w) => $w
            ->whereRaw('LOWER(nama) LIKE ?', [$like])
            ->orWhereRaw('LOWER(alamat) LIKE ?', [$like])
            ->orWhereRaw('LOWER(telepon) LIKE ?', [$like])
        );
    }
}