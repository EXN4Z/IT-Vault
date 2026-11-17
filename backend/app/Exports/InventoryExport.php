<?php

namespace App\Exports;

use App\Exports\Support\Style;
use App\Models\Inventory;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class InventoryExport implements
    FromQuery, WithHeadings, WithMapping, WithCustomStartCell,
    WithColumnWidths, WithColumnFormatting, WithEvents
{
    // label status di Excel (sama dengan yang dibaca statusDariLabel() di import)
    private const STATUS_LABEL = [
        'tersedia'           => 'Tersedia',
        'dipakai'            => 'Dipakai',
        'dipinjam'           => 'Dipakai',
        'menunggu_perbaikan' => 'Menunggu Perbaikan',
        'diperbaiki'         => 'Sedang Diperbaiki',
        'rusak_berat'        => 'Rusak Berat',
        'dijual'             => 'Dijual',
    ];

    // label status => [warna latar, warna teks]
    private const STATUS_WARNA = [
        'Tersedia'           => ['DCFCE7', '15803D'],
        'Dipakai'            => ['DBEAFE', '1D4ED8'],
        'Menunggu Perbaikan' => ['FEF3C7', 'B45309'],
        'Sedang Diperbaiki'  => ['FEF3C7', 'B45309'],
        'Rusak Berat'        => ['FEE2E2', 'B91C1C'],
        'Dijual'             => ['E2E8F0', '475569'],
    ];

    private array $kolom;

    public function __construct(private array $opsi)
    {
        $semua = $this->definisi();
        $dipilih = $opsi['columns'] ?? [];

        // urutan mengikuti definisi (sama dengan urutan header import); kosong = semua kolom
        $this->kolom = $dipilih === []
            ? $semua
            : array_intersect_key($semua, array_flip($dipilih));
    }

    // key => [label header, nilai, lebar kolom]
    private function definisi(): array
    {
        return [
            'kode_inventory'    => ['Kode Inventory',    fn ($i) => $this->teks($i->kode_inventory), 17],
            'kategori'          => ['Kategori',          fn ($i) => $this->teks($i->kategori?->nama), 18],
            'merk'              => ['Merk',              fn ($i) => $this->teks($i->merk), 18],
            'type'              => ['Type',              fn ($i) => $this->teks($i->type), 23],
            'warna'             => ['Warna',             fn ($i) => $this->teks($i->warna), 16],
            'nama'              => ['Nama',              fn ($i) => $this->teks($i->nama), 42],
            'serial_number'     => ['Serial Number',     fn ($i) => $this->teks($i->serial_number), 26],
            'keterangan'        => ['Keterangan',        fn ($i) => $this->teks($i->keterangan), 42],
            'jumlah'            => ['Jumlah',            fn ($i) => $i->jumlah, 10],
            'status'            => ['Status',            fn ($i) => $this->labelStatus($i->status), 21],
            'pemakai_saat_ini'  => ['Pemakai Saat Ini',  fn ($i) => $this->teks($i->peminjam?->name), 20],
            'supplier'          => ['Supplier',          fn ($i) => $this->teks($i->supplier?->nama), 24],
            'tanggal_pembelian' => ['Tanggal Pembelian', fn ($i) => $this->tanggal($i->tanggal_invoice), 20],
            'tanggal_input'     => ['Tanggal Input',     fn ($i) => $this->tanggal($i->tanggal_input), 16],
            'perusahaan'        => ['Perusahaan',        fn ($i) => $this->teks($i->perusahaan?->nama), 29],
        ];
    }

    // kosong -> "-" (import membaca "-" sebagai kosong)
    private function teks(mixed $v): string
    {
        $v = trim((string) $v);

        return $v === '' ? '-' : $v;
    }

    // "6 Jan 2026" (dibaca balik oleh parseTanggal() di import)
    private function tanggal(mixed $v): string
    {
        return $v ? Carbon::parse($v)->locale('id')->translatedFormat('j M Y') : '-';
    }

    private function labelStatus(?string $status): string
    {
        $kunci = strtolower((string) $status);

        return self::STATUS_LABEL[$kunci] ?? Str::headline($kunci);
    }

    private function csv(): bool
    {
        return ($this->opsi['format'] ?? 'xlsx') === 'csv';
    }

    private function hurufKolom(string $key): string
    {
        return Coordinate::stringFromColumnIndex(array_search($key, array_keys($this->kolom), true) + 1);
    }

    public function query(): EloquentBuilder
    {
        $q = Inventory::query()
            ->with(['kategori', 'supplier', 'perusahaan', 'peminjam'])
            ->orderBy('id');

        $scope = $this->opsi['scope'];

        if ($scope !== 'all') {
            if (!empty($this->opsi['status'])) {
                $q->where('status', $this->opsi['status']);
            }

            if (!empty($this->opsi['search'])) {
                $kata = '%' . $this->opsi['search'] . '%';
                $q->where(function ($w) use ($kata) {
                    $w->where('kode_inventory', 'ILIKE', $kata)
                      ->orWhere('nama', 'ILIKE', $kata)
                      ->orWhere('merk', 'ILIKE', $kata)
                      ->orWhere('type', 'ILIKE', $kata)
                      ->orWhere('serial_number', 'ILIKE', $kata);
                });
            }
        }

        if ($scope === 'page') {
            // ambil id halaman itu dulu; limit/offset langsung di query akan ditimpa oleh chunking FromQuery
            $ids = (clone $q)
                ->forPage($this->opsi['page'] ?? 1, $this->opsi['per_page'] ?? 10)
                ->pluck('id');

            $q->whereIn('id', $ids);
        }

        return $q;
    }

    public function startCell(): string
    {
        return 'A' . ($this->csv() ? 1 : Style::BARIS_HEADER);
    }

    public function headings(): array
    {
        return array_map(fn ($k) => $k[0], array_values($this->kolom));
    }

    public function map($row): array
    {
        return array_map(fn ($k) => $k[1]($row), array_values($this->kolom));
    }

    public function columnWidths(): array
    {
        $lebar = [];

        foreach (array_keys($this->kolom) as $key) {
            $lebar[$this->hurufKolom($key)] = $this->kolom[$key][2];
        }

        return $lebar;
    }

    // serial number sebagai teks supaya tidak diubah jadi angka / notasi ilmiah
    public function columnFormats(): array
    {
        return isset($this->kolom['serial_number'])
            ? [$this->hurufKolom('serial_number') => NumberFormat::FORMAT_TEXT]
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

                $info = Style::terapkan(
                    $s,
                    'Data Inventory',
                    'inventory',
                    $this->opsi['scope'] ?? 'all',
                    count($this->kolom),
                    $this->query()->count(),
                    18, // tinggi baris tetap, seperti Data Inventory
                );

                // sel status berwarna (menimpa warna zebra)
                if (isset($this->kolom['status'])) {
                    $kol = $this->hurufKolom('status');

                    for ($r = $info['awal']; $r <= $info['akhir']; $r++) {
                        $warna = self::STATUS_WARNA[(string) $s->getCell("{$kol}{$r}")->getValue()] ?? null;

                        if ($warna) {
                            $sel = $s->getStyle("{$kol}{$r}");
                            $sel->getFill()->setFillType('solid')->getStartColor()->setRGB($warna[0]);
                            $sel->getFont()->setBold(true)->getColor()->setRGB($warna[1]);
                        }
                    }
                }
            },
        ];
    }
}