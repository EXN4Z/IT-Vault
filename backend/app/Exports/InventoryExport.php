<?php

namespace App\Exports;

use App\Models\Inventory; // sesuaikan namespace model-mu
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;

class InventoryExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
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

    private function definisi(): array
    {
        return [
            'kode_inventory'    => ['Kode Inventory',    fn ($i) => $i->kode_inventory],
            'kategori'          => ['Kategori',          fn ($i) => $i->kategori?->nama],
            'merk'              => ['Merk',              fn ($i) => $i->merk],
            'type'              => ['Type',              fn ($i) => $i->type],
            'warna'             => ['Warna',             fn ($i) => $i->warna],
            'nama'              => ['Nama',              fn ($i) => $i->nama],
            'serial_number'     => ['Serial Number',     fn ($i) => $i->serial_number],
            'keterangan'        => ['Keterangan',        fn ($i) => $i->keterangan],
            'jumlah'            => ['Jumlah',            fn ($i) => $i->jumlah],
            'status'            => ['Status',            fn ($i) => Str::headline((string) $i->status)],
            'pemakai_saat_ini'  => ['Pemakai Saat Ini',  fn ($i) => $i->peminjam?->name],
            'supplier'          => ['Supplier',          fn ($i) => $i->supplier?->nama],
            'tanggal_pembelian' => ['Tanggal Pembelian', fn ($i) => $i->tanggal_invoice],
            'tanggal_input'     => ['Tanggal Input',     fn ($i) => $i->tanggal_input],
            'perusahaan'        => ['Perusahaan',        fn ($i) => $i->perusahaan?->nama],
        ];
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

    public function headings(): array
    {
        return array_map(fn ($k) => $k[0], array_values($this->kolom));
    }

    public function map($row): array
    {
        return array_map(fn ($k) => $k[1]($row), array_values($this->kolom));
    }
}