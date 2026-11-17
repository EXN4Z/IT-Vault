<?php

namespace App\Exports;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

// StringValueBinder: semua sel ditulis sebagai teks, supaya NIK 16 digit tidak jadi 3.2E+15
class UserExport extends StringValueBinder implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithCustomValueBinder
{
    // key harus sama dengan EXPORT_COLUMNS di frontend; password sengaja tidak ada
    public const COLUMNS = [
        'nik' => 'NIK',
        'name' => 'Nama',
        'email' => 'Email',
        'phone' => 'Telepon',
        'role' => 'Role',
        'perusahaan' => 'Perusahaan',
        'cabang' => 'Cabang',
        'departemen' => 'Departemen',
        'tanggal_masuk' => 'Tanggal Masuk',
        'status' => 'Status',
    ];

    private array $columns;

    public function __construct(private Builder $query, array $columns)
    {
        $this->columns = array_values(array_intersect(self::columnKeys(), $columns));
    }

    public static function columnKeys(): array
    {
        return array_keys(self::COLUMNS);
    }

    public function collection(): Collection
    {
        return $this->query->with(['role:id,nama', 'perusahaan:id,nama', 'cabang:id,nama', 'departemen:id,nama'])->get();
    }

    public function headings(): array
    {
        return array_map(fn (string $key) => self::COLUMNS[$key], $this->columns);
    }

    public function map($row): array
    {
        return array_map(fn (string $key) => match ($key) {
            'role' => $row->role?->nama,
            'perusahaan' => $row->perusahaan?->nama,
            'cabang' => $row->cabang?->nama,
            'departemen' => $row->departemen?->nama,
            'tanggal_masuk' => $row->tanggal_masuk?->format('Y-m-d'),
            'status' => $row->status === 'aktif' ? 'Aktif' : 'Nonaktif',
            default => $row->{$key},
        }, $this->columns);
    }
}