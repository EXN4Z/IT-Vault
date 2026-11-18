<?php

namespace App\Imports;

use App\Models\Supplier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;

class SupplierImport implements ToCollection
{
    // baris awal yang discan untuk mencari header (judul/keterangan di atas tabel dilewati)
    private const MAX_BARIS_DISCAN = 10;

    // header dianggap ketemu kalau kolom ini ada dalam satu baris
    private const KOLOM_PENANDA_HEADER = ['nama'];

    // isi sel yang dianggap kosong
    private const PLACEHOLDER = ['-', '--', '---', 'n/a', 'na', '.', 'kosong'];

    public int $ditambahkan = 0;
    public int $dilewati = 0;
    public array $errors = [];

    public function collection(Collection $rows): void
    {
        [$barisHeader, $peta] = $this->cariHeader($rows);

        if ($barisHeader === null) {
            $this->errors[] = 'Header tidak ditemukan. Pastikan ada baris dengan kolom: '
                . implode(', ', self::KOLOM_PENANDA_HEADER)
                . ' (dicari di ' . self::MAX_BARIS_DISCAN . ' baris pertama).';
            return;
        }

        foreach ($rows->slice($barisHeader + 1) as $index => $row) {
            $baris = $index + 1; // nomor baris di Excel (slice mempertahankan key asli, index mulai dari 0)
            $arr = $row->toArray();

            // baris kosong dilewati
            if (! array_filter($arr, fn ($v) => trim((string) $v) !== '')) {
                continue;
            }

            // footer hasil export dilewati
            if (str_contains(strtolower(implode(' ', array_map('strval', $arr))), 'digenerate otomatis')) {
                continue;
            }

            $data = [
                'nama'    => $this->ambil($row, $peta, 'nama'),
                'alamat'  => $this->ambil($row, $peta, 'alamat'),
                'telepon' => $this->ambil($row, $peta, 'telepon'),
            ];

            $validator = Validator::make($data, [
                'nama'    => ['required', 'string', 'max:255'],
                'alamat'  => ['nullable', 'string'],
                'telepon' => ['nullable', 'string', 'max:50'],
            ]);

            if ($validator->fails()) {
                $this->errors[] = "Baris {$baris}: " . $validator->errors()->first();
                continue;
            }

            // sudah ada (nama sama, tanpa peduli huruf besar/kecil) -> dilewati; data lama tidak diubah.
            // setiap baris langsung disimpan, jadi nama kembar di dalam file yang sama ikut terdeteksi
            if (Supplier::whereRaw('LOWER(nama) = ?', [strtolower($data['nama'])])->exists()) {
                $this->dilewati++;
                continue;
            }

            try {
                Supplier::create($data);
                $this->ditambahkan++;
            } catch (\Throwable $e) {
                $this->errors[] = "Baris {$baris}: " . $e->getMessage();
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
                $nama = $this->normalisasiHeader((string) $cell);

                if ($nama !== '') {
                    $peta[$nama] = $pos;
                }
            }

            foreach (self::KOLOM_PENANDA_HEADER as $penanda) {
                if (isset($peta[$penanda])) {
                    return [$i, $peta];
                }
            }
        }

        return [null, []];
    }

    // "Nama " / "NAMA" / "No. Telepon" -> "nama" / "nama" / "no_telepon"
    private function normalisasiHeader(string $h): string
    {
        $h = strtolower(trim($h));
        $h = preg_replace('/[\s\-]+/', '_', $h);
        $h = preg_replace('/[^a-z0-9_]/', '', $h);

        return trim($h, '_');
    }

    // isi sel -> teks bersih, atau null kalau kosong / placeholder ("-", "n/a", dst)
    private function ambil(Collection $row, array $peta, string $kolom): ?string
    {
        if (! isset($peta[$kolom])) {
            return null;
        }

        $v = $row[$peta[$kolom]] ?? null;

        if ($v === null) {
            return null;
        }

        // angka di Excel terbaca float (mis. telepon 2.47614027E+8)
        if (is_float($v)) {
            $v = sprintf('%.0f', $v);
        }

        $v = trim((string) $v);

        return ($v === '' || in_array(strtolower($v), self::PLACEHOLDER, true)) ? null : $v;
    }
}