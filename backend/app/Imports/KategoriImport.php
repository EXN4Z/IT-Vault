<?php

namespace App\Imports;

use App\Models\Kategori;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;

class KategoriImport implements ToCollection
{
    // baris awal yang discan untuk mencari header (judul/keterangan di atas tabel dilewati)
    private const MAX_BARIS_DISCAN = 10;

    private const NAMA_HEADER = ['nama', 'nama_kategori'];

    // isi sel yang dianggap kosong
    private const PLACEHOLDER = ['-', '--', '---', 'n/a', 'na', '.', 'kosong'];

    public int $ditambahkan = 0;
    public int $dilewati = 0;
    public array $errors = [];

    public function collection(Collection $rows): void
    {
        [$barisHeader, $posisiNama] = $this->cariHeader($rows);

        if ($barisHeader === null) {
            $this->errors[] = 'Header tidak ditemukan. Pastikan ada baris dengan kolom "Nama" (dicari di '
                . self::MAX_BARIS_DISCAN . ' baris pertama).';
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

            $nama = trim((string) ($row[$posisiNama] ?? ''));
            $nama = in_array(strtolower($nama), self::PLACEHOLDER, true) ? '' : $nama;

            $validator = Validator::make(['nama' => $nama], [
                'nama' => ['required', 'string', 'max:255'],
            ]);

            if ($validator->fails()) {
                $this->errors[] = "Baris {$baris}: " . $validator->errors()->first();
                continue;
            }

            // sudah ada (nama sama, tanpa peduli huruf besar/kecil) -> dilewati.
            // setiap baris langsung disimpan, jadi nama kembar di dalam file yang sama ikut terdeteksi
            if (Kategori::whereRaw('LOWER(nama) = ?', [strtolower($nama)])->exists()) {
                $this->dilewati++;
                continue;
            }

            try {
                Kategori::create(['nama' => $nama]);
                $this->ditambahkan++;
            } catch (\Throwable $e) {
                $this->errors[] = "Baris {$baris}: " . $e->getMessage();
            }
        }
    }

    /** Cari baris header ("Nama") di N baris pertama. Return [indexBaris, posisiKolom] atau [null, null]. */
    private function cariHeader(Collection $rows): array
    {
        foreach ($rows->take(self::MAX_BARIS_DISCAN) as $i => $row) {
            foreach ($row as $pos => $cell) {
                if (in_array($this->normalisasiHeader((string) $cell), self::NAMA_HEADER, true)) {
                    return [$i, $pos];
                }
            }
        }

        return [null, null];
    }

    private function normalisasiHeader(string $h): string
    {
        $h = strtolower(trim($h));
        $h = preg_replace('/[\s\-]+/', '_', $h);
        $h = preg_replace('/[^a-z0-9_]/', '', $h);

        return trim($h, '_');
    }
}