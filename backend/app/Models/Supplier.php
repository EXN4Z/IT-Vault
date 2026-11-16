<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "suppliers")
    protected $table = 'supplier';

    protected $fillable = ['nama', 'alamat', 'telepon'];
}
