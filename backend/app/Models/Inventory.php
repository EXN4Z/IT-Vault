<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    // status yang dikenal; dipakai validasi dan filter tab
    public const STATUSES = ['tersedia', 'dipinjam', 'menunggu_perbaikan', 'diperbaiki', 'rusak_berat', 'dijual'];

    // nama tabel singular, jadi harus ditulis eksplisit (default Laravel: "inventories")
    protected $table = 'inventory';

    // kode_inventory sengaja tidak masuk: dibuat otomatis oleh trigger database (IT-YY-00000)
    protected $fillable = [
        'parent_id', 'kategori_id', 'nama', 'warna', 'serial_number', 'jumlah',
        'tanggal_garansi', 'tanggal_input', 'tanggal_invoice', 'merk', 'type',
        'perusahaan_id', 'keterangan', 'foto', 'supplier_id', 'no_surat_jalan',
        'no_good_receive', 'status', 'peminjam_id',
    ];

    // tanggal keluar sebagai 'YYYY-MM-DD' (bukan ISO), langsung cocok dengan DatePicker di frontend
    protected $casts = [
        'tanggal_garansi' => 'date:Y-m-d',
        'tanggal_input' => 'date:Y-m-d',
        'tanggal_invoice' => 'date:Y-m-d',
    ];

    // efek link yang baru dihitung saat saving dan dicatat ke riwayat saat saved (butuh id kelengkapan)
    protected array $linkEffects = [];

    // peminjam kelengkapan ikut barang utamanya tiap kali link-nya berubah (tombol Link / Lepas link maupun form Ubah):
    // - dipasang ke barang utama yang sedang dipinjam: ikut dipinjam karyawan yang sama, tercatat di riwayat peminjaman
    // - dilepas dari barang utama yang sedang dipinjam: dianggap dikembalikan otomatis, kembali tersedia, tercatat di riwayat
    // (status dipinjam <-> tersedia saja yang berubah; status lain seperti rusak / diperbaiki dibiarkan)
    protected static function booted(): void
    {
        static::saving(function (self $inventory) {
            $inventory->linkEffects = [];

            if (! $inventory->isDirty('parent_id')) {
                return;
            }

            $newParent = $inventory->parent_id ? self::find($inventory->parent_id) : null;
            $oldId = $inventory->getOriginal('parent_id');
            $oldParent = $oldId ? self::find($oldId) : null;

            $oldBorrowed = $oldParent?->status === 'dipinjam';
            $newBorrowed = $newParent?->status === 'dipinjam';

            if ($oldBorrowed) {
                $inventory->linkEffects['detach'] = $oldParent->id;
            }

            if ($newBorrowed) {
                $inventory->linkEffects['attach'] = $newParent->id;
                $inventory->peminjam_id = $newParent->peminjam_id;

                // barang baru belum punya status di atribut (default database), dianggap tersedia
                if (($inventory->status ?? 'tersedia') === 'tersedia') {
                    $inventory->status = 'dipinjam';
                }
            } elseif ($oldBorrowed) {
                $inventory->peminjam_id = null;

                if ($inventory->status === 'dipinjam') {
                    $inventory->status = 'tersedia';
                }
            }
        });

        static::saved(function (self $inventory) {
            $effects = $inventory->linkEffects;
            $inventory->linkEffects = [];

            if (isset($effects['detach'])) {
                $peminjaman = Peminjaman::aktif()->where('inventory_id', $effects['detach'])->latest('id')->first();

                if ($peminjaman) {
                    PeminjamanItem::lepas($peminjaman, $inventory->id, $inventory->status, isset($effects['attach']));
                }
            }

            if (isset($effects['attach'])) {
                $peminjaman = Peminjaman::aktif()->where('inventory_id', $effects['attach'])->latest('id')->first();

                if ($peminjaman) {
                    PeminjamanItem::buka($peminjaman, $inventory->id);
                }
            }
        });
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(Kategori::class);
    }

    public function perusahaan(): BelongsTo
    {
        return $this->belongsTo(Perusahaan::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    // karyawan yang sedang meminjam (barang utama dan kelengkapannya sama)
    public function peminjam(): BelongsTo
    {
        return $this->belongsTo(User::class, 'peminjam_id');
    }

    public function peminjaman(): HasMany
    {
        return $this->hasMany(Peminjaman::class);
    }

    // jejak kelengkapan ini di peminjaman barang utamanya
    public function peminjamanItems(): HasMany
    {
        return $this->hasMany(PeminjamanItem::class);
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    // aturan link barang utama-kelengkapan (cuma 2 tingkat):
    // - kelengkapan harus dilepas dulu kalau mau pindah ke barang utama lain
    // - inventory yang sudah punya kelengkapan (barang utama) tidak bisa jadi kelengkapan
    // - inventory yang sudah jadi kelengkapan tidak bisa dipilih sebagai barang utama
    // return pesan error, atau null kalau boleh
    public function linkError(self $parent): ?string
    {
        if ($parent->is($this)) {
            return 'Inventory tidak bisa jadi barang utama dirinya sendiri.';
        }

        if ($this->parent_id !== null && $this->parent_id !== $parent->id) {
            return 'Inventory ini masih terhubung ke barang utama lain. Lepas link dulu sebelum menghubungkan ke inventory lain.';
        }

        if ($this->children()->exists()) {
            return 'Inventory ini sudah jadi barang utama, jadi tidak bisa dihubungkan ke inventory lain.';
        }

        if ($parent->parent_id !== null) {
            return 'Inventory tujuan sudah jadi kelengkapan dari inventory lain, jadi tidak bisa dijadikan barang utama.';
        }

        // jangan menimpa peminjam lain: kelengkapan yang sedang dipinjam karyawan A tidak boleh
        // dipasang ke barang utama yang dipinjam karyawan B
        if ($parent->status === 'dipinjam' && $this->status === 'dipinjam' && $this->peminjam_id !== $parent->peminjam_id) {
            return 'Inventory ini sedang dipinjam karyawan lain, jadi tidak bisa dipasang ke barang utama yang dipinjam karyawan berbeda.';
        }

        return null;
    }

    // aturan serah terima: hanya barang utama yang sedang tersedia
    // (kelengkapan ikut barang utamanya, tidak diserahkan sendiri)
    // return pesan error, atau null kalau boleh
    public function serahError(): ?string
    {
        if ($this->parent_id !== null) {
            return 'Kelengkapan ikut diserahkan bersama barang utamanya, tidak bisa diserahkan sendiri.';
        }

        if ($this->status !== 'tersedia') {
            return 'Hanya inventory berstatus Tersedia yang bisa diserahkan.';
        }

        return null;
    }
}