<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "kategoris")
    protected $table = 'kategori';

    protected $fillable = ['nama'];
}
