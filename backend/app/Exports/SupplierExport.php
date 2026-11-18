<?php

namespace App\Exports;

use App\Exports\Support\Style;
use App\Models\Supplier;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class SupplierExport implements
    FromCollection, WithHeadings, WithMapping, WithCustomStartCell,
    WithColumnWidths, WithColumnFormatting, WithEvents
{
    // key kolom (sama dengan EXPORT_COLUMNS di halaman) => [label header, lebar kolom]
    public const KOLOM = [
        'nama'    => ['Nama', 36],
        'alamat'  => ['Alamat', 60],
        'telepon' => ['Telepon', 18],
    ];

    private array $kolom;
    private int $total = 0;

    /**
     * @param array       $columns key kolom yang dipilih (kosong = semua)
     * @param string      $format  'xlsx' (dengan desain laporan) atau 'csv' (polos)
     * @param string      $scope   all | filtered | page
     * @param string|null $search  kata kunci (diabaikan kalau scope = all)
     */
    public function __construct(
        array $columns = [],
        private string $format = 'xlsx',
        private string $scope = 'all',
        private ?string $search = null,
        private int $page = 1,
        private int $perPage = 10,
    ) {
        $dipilih = array_values(array_intersect(array_keys(self::KOLOM), $columns));
        $this->kolom = $dipilih ?: array_keys(self::KOLOM);
    }

    private function csv(): bool
    {
        return $this->format === 'csv';
    }

    private function hurufKolom(string $key): string
    {
        return Coordinate::stringFromColumnIndex(array_search($key, $this->kolom, true) + 1);
    }

    public function collection(): Collection
    {
        // urutan harus sama dengan query daftar di SupplierController, supaya "halaman ini" persis isi tabel
        $query = Supplier::query()->orderBy('nama');

        if ($this->scope !== 'all' && $this->search) {
            $kata = '%' . $this->search . '%';

            $query->where(function ($w) use ($kata) {
                $w->where('nama', 'ILIKE', $kata)
                    ->orWhere('alamat', 'ILIKE', $kata)
                    ->orWhere('telepon', 'ILIKE', $kata);
            });
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
        return array_map(fn ($k) => self::KOLOM[$k][0], $this->kolom);
    }

    public function map($s): array
    {
        return array_map(fn ($k) => $s->{$k}, $this->kolom);
    }

    public function columnWidths(): array
    {
        $lebar = [];

        foreach ($this->kolom as $k) {
            $lebar[$this->hurufKolom($k)] = self::KOLOM[$k][1];
        }

        return $lebar;
    }

    // telepon sebagai teks supaya angka 0 di depan tidak hilang
    public function columnFormats(): array
    {
        return in_array('telepon', $this->kolom, true)
            ? [$this->hurufKolom('telepon') => NumberFormat::FORMAT_TEXT]
            : [];
    }

    public function registerEvents(): array
    {
        if ($this->csv()) {
            return []; // CSV polos
        }

        return [
            AfterSheet::class => function (AfterSheet $event) {
                $s = $event->sheet->getDelegate();

                // tinggi baris otomatis (null) karena alamat panjang dibungkus
                $info = Style::terapkan(
                    $s,
                    'Data Supplier',
                    'supplier',
                    $this->scope,
                    count($this->kolom),
                    $this->total,
                );

                if ($this->total > 0 && in_array('alamat', $this->kolom, true)) {
                    $kol = $this->hurufKolom('alamat');
                    $s->getStyle("{$kol}{$info['awal']}:{$kol}{$info['akhir']}")->getAlignment()->setWrapText(true);
                }
            },
        ];
    }
}