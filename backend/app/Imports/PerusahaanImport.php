<?php

namespace App\Imports;

use App\Models\Perusahaan;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;

class PerusahaanImport implements ToCollection
{
    // baris awal yang discan untuk mencari header (judul/keterangan di atas tabel dilewati)
    private const MAX_BARIS_DISCAN = 10;

    // header dianggap ketemu kalau semua kolom ini ada dalam satu baris
    private const KOLOM_PENANDA_HEADER = ['nama', 'alamat'];

    public int $ditambahkan = 0;
    public int $dipulihkan = 0;
    public int $dilewati = 0;
    public array $errors = [];

    public function collection(Collection $rows): void
    {
        [$barisHeader, $peta] = $this->cariHeader($rows);

        if ($barisHeader === null) {
            $this->errors[] = 'Header tidak ditemukan. Pastikan ada baris dengan kolom: '
                . implode(', ', self::KOLOM_PENANDA_HEADER) . ' (dicari di ' . self::MAX_BARIS_DISCAN . ' baris pertama).';
            return;
        }

        foreach ($rows->slice($barisHeader + 1) as $index => $row) {
            $baris = $index + 1; // nomor baris di Excel (index mulai dari 0)

            $data = [
                'nama'    => $this->ambil($row, $peta, 'nama'),
                'alamat'  => $this->ambil($row, $peta, 'alamat') ?: null,
                'link'    => $this->ambil($row, $peta, 'link') ?: null,
                'telepon' => $this->ambil($row, $peta, 'telepon') ?: null,
            ];

            // baris kosong = akhir tabel; baris sesudahnya (footer, catatan) diabaikan
            if (! array_filter($row->toArray(), fn ($v) => trim((string) $v) !== '')) {
                break;
            }

            $validator = Validator::make($data, [
                'nama'    => ['required', 'string', 'max:255'],
                'alamat'  => ['nullable', 'string'],
                'link'    => ['nullable', 'string', 'max:255'],
                'telepon' => ['nullable', 'string', 'max:50'],
            ]);

            if ($validator->fails()) {
                $this->errors[] = "Baris {$baris}: " . $validator->errors()->first();
                continue;
            }

            // withTrashed() hanya ada kalau model memakai SoftDeletes
            if (Perusahaan::where('nama', $data['nama'])->exists()) {
                $this->dilewati++;
            } else {
                Perusahaan::create($data);
                $this->ditambahkan++;
            }
        }
    }

    /**
     * Cari baris header di N baris pertama.
     * Return [indexBaris, peta] dengan peta = ['nama' => 0, 'alamat' => 1, ...] (nama kolom => posisi).
     */
    private function cariHeader(Collection $rows): array
    {
        foreach ($rows->take(self::MAX_BARIS_DISCAN) as $i => $row) {
            $peta = [];
            foreach ($row as $pos => $cell) {
                $nama = $this->normalisasi($cell);
                if ($nama !== '') {
                    $peta[$nama] = $pos;
                }
            }

            if (! array_diff(self::KOLOM_PENANDA_HEADER, array_keys($peta))) {
                return [$i, $peta];
            }
        }

        return [null, []];
    }

    // "Nama " / "NAMA" / "Nama Perusahaan" -> "nama" / "nama" / "nama_perusahaan"
    private function normalisasi(mixed $cell): string
    {
        return str_replace(' ', '_', strtolower(trim((string) $cell)));
    }

    private function ambil(Collection $row, array $peta, string $kolom): string
    {
        return isset($peta[$kolom]) ? trim((string) ($row[$peta[$kolom]] ?? '')) : '';
    }
}