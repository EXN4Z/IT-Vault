<?php

namespace App\Imports;

use App\Models\Cabang;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;

// =============================================================================
// IMPORT CABANG: membaca file Excel / CSV lalu menyimpannya ke tabel cabang
// - semua-atau-tidak-sama-sekali: kalau ada satu baris bermasalah, TIDAK ada yang disimpan
// - baris judul dicari otomatis (baris yang punya kolom "Nama"), jadi file hasil export
//   yang punya judul laporan di atasnya tetap bisa dibaca
// - data dibaca sampai baris kosong pertama, sehingga catatan di bawah tabel tidak ikut
// =============================================================================
class CabangImport implements ToCollection
{
    // batas jumlah pesan error yang dikirim ke frontend
    private const MAX_ERRORS = 20;

    public int $imported = 0;

    // pesan error, contoh: "Baris 3: Nama cabang wajib diisi."
    public array $errors = [];

    public function collection(Collection $rows): void
    {
        // tiap baris jadi array biasa: [0 => kolom A, 1 => kolom B, ...]
        $rows = $rows->map(fn ($r) => $r instanceof Collection ? $r->values()->all() : array_values((array) $r))->values();

        // cari baris judul di 20 baris pertama: baris yang salah satu selnya "Nama"
        $headerIndex = null;
        $cols = []; // nama kolom (huruf kecil) => posisi kolom
        foreach ($rows->take(20) as $index => $row) {
            $names = array_map(fn ($cell) => mb_strtolower(trim((string) $cell)), $row);
            if (in_array('nama', $names, true)) {
                $headerIndex = $index;
                foreach ($names as $pos => $name) {
                    $cols[$name] ??= $pos; // kalau judul dobel, pakai yang pertama
                }
                break;
            }
        }

        if ($headerIndex === null) {
            $this->errors[] = 'Kolom "Nama" tidak ditemukan. Judul kolom yang dipakai: Nama, Alamat, Link, Telepon.';

            return;
        }

        $valid = [];

        // nama yang sudah ada di database (huruf kecil), untuk mendeteksi nama kembar
        $existing = array_flip(Cabang::pluck('nama')->map(fn ($n) => mb_strtolower(trim($n)))->all());
        $seen = []; // nama yang sudah muncul di file ini => nomor barisnya

        foreach ($rows->slice($headerIndex + 1) as $index => $row) {
            $line = $index + 1; // nomor baris di Excel (index mulai 0, baris Excel mulai 1)

            $data = [];
            foreach (['nama', 'alamat', 'link', 'telepon'] as $field) {
                $data[$field] = isset($cols[$field]) ? $this->clean($row[$cols[$field]] ?? null) : null;
            }

            // baris kosong = akhir tabel; apa pun di bawahnya (catatan, tanda tangan) diabaikan
            if (count(array_filter($row, fn ($v) => $this->clean($v) !== null)) === 0) {
                break;
            }

            $validator = Validator::make($data, [
                'nama' => ['required', 'string', 'max:150'],
                'alamat' => ['nullable', 'string'],
                'link' => ['nullable', 'string', 'max:255'],
                'telepon' => ['nullable', 'string', 'max:30'],
            ], [
                'nama.required' => 'Nama cabang wajib diisi.',
                'nama.max' => 'Nama cabang maksimal 150 karakter.',
                'link.max' => 'Link maksimal 255 karakter.',
                'telepon.max' => 'Telepon maksimal 30 karakter.',
            ]);

            foreach ($validator->errors()->all() as $message) {
                $this->errors[] = "Baris {$line}: {$message}";
            }

            // nama tidak boleh sama dengan cabang yang sudah ada, atau dengan baris lain di file
            if ($data['nama'] !== null) {
                $key = mb_strtolower($data['nama']);

                if (isset($existing[$key])) {
                    $this->errors[] = "Baris {$line}: Nama cabang ini sudah dipakai cabang lain.";
                } elseif (isset($seen[$key])) {
                    $this->errors[] = "Baris {$line}: Nama cabang sama dengan baris {$seen[$key]}.";
                } else {
                    $seen[$key] = $line;
                }
            }

            $valid[] = $data;
        }

        if (count($valid) === 0 && ! $this->errors) {
            $this->errors[] = 'File kosong, tidak ada data untuk diimpor.';
        }

        if ($this->errors) {
            $total = count($this->errors);
            $this->errors = array_slice($this->errors, 0, self::MAX_ERRORS);
            if ($total > self::MAX_ERRORS) {
                $this->errors[] = '...dan '.($total - self::MAX_ERRORS).' masalah lainnya.';
            }

            return;
        }

        DB::transaction(function () use ($valid) {
            foreach ($valid as $data) {
                Cabang::create($data);
            }
        });

        $this->imported = count($valid);
    }

    // sel kosong -> null, angka -> teks (nomor telepon), spasi di pinggir dibuang
    private function clean(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}