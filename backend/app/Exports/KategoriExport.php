<?php

namespace App\Exports;

use App\Exports\Support\Style;
use App\Models\Kategori;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Events\AfterSheet;

class KategoriExport implements
    FromCollection, WithHeadings, WithMapping, WithCustomStartCell, WithColumnWidths, WithEvents
{
    // key kolom (sama dengan EXPORT_COLUMNS di halaman) => [label header, lebar kolom]
    public const KOLOM = [
        'nama' => ['Nama', 40],
    ];

    private int $total = 0;

    /**
     * @param string      $format 'xlsx' (dengan desain laporan) atau 'csv' (polos)
     * @param string      $scope  all | filtered | page
     * @param string|null $search kata kunci (diabaikan kalau scope = all)
     */
    public function __construct(
        private string $format = 'xlsx',
        private string $scope = 'all',
        private ?string $search = null,
        private int $page = 1,
        private int $perPage = 10,
    ) {
    }

    private function csv(): bool
    {
        return $this->format === 'csv';
    }

    public function collection(): Collection
    {
        // urutan harus sama dengan query daftar di KategoriController, supaya "halaman ini" persis isi tabel
        $query = Kategori::query()->orderBy('nama');

        if ($this->scope !== 'all' && $this->search) {
            $query->where('nama', 'ILIKE', '%' . $this->search . '%');
        }

        if ($this->scope === 'page') {
            $query->forPage($this->page, $this->perPage);
        }

        $data = $query->get();
        $this->total = $data->count();

        return $data;
    }

    public function startCell(): string
    {
        return 'A' . ($this->csv() ? 1 : Style::BARIS_HEADER);
    }

    public function headings(): array
    {
        return [self::KOLOM['nama'][0]];
    }

    public function map($k): array
    {
        return [$k->nama];
    }

    public function columnWidths(): array
    {
        return ['A' => self::KOLOM['nama'][1]];
    }

    public function registerEvents(): array
    {
        if ($this->csv()) {
            return []; // CSV polos
        }

        return [
            AfterSheet::class => function (AfterSheet $event) {
                Style::terapkan(
                    $event->sheet->getDelegate(),
                    'Data Kategori',
                    'kategori',
                    $this->scope,
                    1,
                    $this->total,
                    18, // tinggi baris tetap, seperti Data Inventory
                );
            },
        ];
    }
}