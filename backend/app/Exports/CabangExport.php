<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

// =============================================================================
// EXPORT CABANG: mengubah query cabang menjadi file Excel / CSV
// - controller yang menentukan DATA-nya (semua / hasil pencarian / satu halaman)
// - class ini hanya menentukan KOLOM dan bentuk barisnya
// =============================================================================
class CabangExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize
{
    // kolom yang boleh diexport: key = nama kolom di database (sama dengan key di
    // EXPORT_COLUMNS frontend), value = judul kolom di file
    public const COLUMNS = [
        'nama' => 'Nama',
        'alamat' => 'Alamat',
        'link' => 'Link',
        'telepon' => 'Telepon',
    ];

    // kolom yang dipilih user, selalu dalam urutan baku COLUMNS (bukan urutan klik)
    private array $columns;

    public function __construct(private Builder $query, array $columns)
    {
        $this->columns = array_values(array_intersect(self::columnKeys(), $columns));
    }

    // daftar key kolom yang valid, dipakai juga oleh CabangExportRequest
    public static function columnKeys(): array
    {
        return array_keys(self::COLUMNS);
    }

    // data baris; ->get() aman karena jumlah cabang kecil
    public function collection(): Collection
    {
        return $this->query->get();
    }

    // baris judul (baris pertama file)
    public function headings(): array
    {
        return array_map(fn (string $key) => self::COLUMNS[$key], $this->columns);
    }

    // satu model Cabang -> satu baris file, hanya kolom yang dipilih
    public function map($row): array
    {
        return array_map(fn (string $key) => $row->{$key}, $this->columns);
    }
}