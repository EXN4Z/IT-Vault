<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Perusahaan extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "perusahaans")
    protected $table = 'perusahaan';

    protected $fillable = ['nama', 'alamat', 'link', 'telepon'];
}