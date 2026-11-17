<?php

namespace App\Exports;

use App\Models\Perusahaan;
use Carbon\Carbon;
use App\Exports\Support\Style;
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
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class PerusahaanExport implements
    FromCollection, WithHeadings, WithMapping, WithCustomStartCell,
    WithColumnWidths, WithColumnFormatting, WithEvents
{
    // key kolom (sama dengan key di ExportModal) => [label header, lebar kolom]
    public const KOLOM = [
        'nama'    => ['Nama', 32],
        'alamat'  => ['Alamat', 60],
        'telepon' => ['Telepon', 18],
        'link'    => ['Link', 45],
    ];

    private array $kolom;
    private int $total = 0;

    public function __construct(
        array $columns = [],
        private string $format = 'xlsx',
        private ?string $search = null,
        private ?array $ids = null,
    ) {
        $dipilih = array_values(array_intersect(array_keys(self::KOLOM), $columns));
        $this->kolom = $dipilih ?: array_keys(self::KOLOM);
    }

    private function csv(): bool
    {
        return $this->format === 'csv';
    }

    private function barisHeader(): int
    {
        return $this->csv() ? 1 : Style::BARIS_HEADER;
    }

    private function hurufKolom(string $key): string
    {
        return Coordinate::stringFromColumnIndex(array_search($key, $this->kolom, true) + 1);
    }

    public function collection(): Collection
    {
        $query = Perusahaan::query()->orderBy('nama');

        if ($this->ids !== null) {
            $query->whereIn('id', $this->ids);
        } elseif ($this->search) {
            $kata = '%' . $this->search . '%';

            $query->where(function ($w) use ($kata) {
                $w->where('nama', 'ILIKE', $kata)
                    ->orWhere('alamat', 'ILIKE', $kata)
                    ->orWhere('telepon', 'ILIKE', $kata);
            });
        }

        $data = $query->get();
        $this->total = $data->count();

        return $data;
    }

    public function startCell(): string
    {
        return 'A' . $this->barisHeader();
    }

    public function headings(): array
    {
        return array_map(fn ($k) => self::KOLOM[$k][0], $this->kolom);
    }

    public function map($p): array
    {
        return array_map(fn ($k) => $p->{$k}, $this->kolom);
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
            return [];
        }

        return [
            AfterSheet::class => function (AfterSheet $event) {
                $s = $event->sheet->getDelegate();

                $cakupan = $this->ids !== null ? 'page' : ($this->search ? 'filtered' : 'all');

                $info = Style::terapkan($s, 'Data Perusahaan', 'perusahaan', $cakupan, count($this->kolom), $this->total);

                // alamat panjang dibungkus, tinggi baris otomatis
                if ($this->total > 0 && in_array('alamat', $this->kolom, true)) {
                    $kol = $this->hurufKolom('alamat');
                    $s->getStyle("{$kol}{$info['awal']}:{$kol}{$info['akhir']}")->getAlignment()->setWrapText(true);
                }
            },
        ];
    }
}