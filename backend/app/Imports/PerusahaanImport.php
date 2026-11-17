<?php

namespace App\Imports;

use App\Models\Perusahaan;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class PerusahaanImport implements ToCollection, WithHeadingRow, WithBatchInserts, WithChunkReading
{
    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $data = [
                'nama'    => trim((string) ($row['nama'] ?? '')),
                'alamat'  => trim((string) ($row['alamat'] ?? '')) ?: null,
                'link'    => trim((string) ($row['link'] ?? '')) ?: null,
                // Excel sering membaca telepon sebagai angka, jadi cast ke string
                'telepon' => trim((string) ($row['telepon'] ?? '')) ?: null,
            ];

            // Lewati baris kosong
            if ($data['nama'] === '') {
                continue;
            }

            Validator::make($data, [
                'nama'    => ['required', 'string', 'max:255'],
                'alamat'  => ['nullable', 'string'],
                'link'    => ['nullable', 'string', 'max:255'],
                'telepon' => ['nullable', 'string', 'max:50'],
            ], [], [
                'nama' => "nama (baris " . ($index + 2) . ")",
            ])->validate();

            Perusahaan::updateOrCreate(
                ['nama' => $data['nama']],
                $data
            );
        }
    }

    public function batchSize(): int
    {
        return 500;
    }

    public function chunkSize(): int
    {
        return 500;
    }
}