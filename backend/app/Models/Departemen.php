<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Departemen extends Model
{
    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "departemens")
    protected $table = 'departemen';

    protected $fillable = ['nama'];
}