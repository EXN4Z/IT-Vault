<?php

namespace App\Imports;

use App\Models\Cabang;
use App\Models\Departemen;
use App\Models\Perusahaan;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCalculatedFormulas;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class UserImport implements ToCollection, WithCalculatedFormulas
{
    private const MAX_BARIS_DISCAN = 10;
    private const KOLOM_PENANDA_HEADER = ['nik', 'email'];

    private const BULAN = [
        'jan' => '01', 'feb' => '02', 'mar' => '03', 'apr' => '04', 'mei' => '05', 'may' => '05',
        'jun' => '06', 'jul' => '07', 'agu' => '08', 'aug' => '08', 'sep' => '09',
        'okt' => '10', 'oct' => '10', 'nov' => '11', 'des' => '12', 'dec' => '12',
    ];

    private const PLACEHOLDER = ['-', '--', '---', 'n/a', 'na', '.', 'kosong'];

    private int $ditambahkan = 0;
    private int $diperbarui = 0;
    private array $errors = [];

    /** cache hasil lookup nama -> id, supaya tidak query per baris */
    private array $cache = [];

    public function collection(Collection $rows): void
    {
        $indexHeader = $this->cariBarisHeader($rows);

        if ($indexHeader === null) {
            $this->errors[] = 'Tidak menemukan baris header (kolom "NIK" atau "Email") di '
                . self::MAX_BARIS_DISCAN . ' baris pertama.';
            return;
        }

        $headers = $rows[$indexHeader]
            ->map(fn ($h) => $this->normalisasiHeader((string) $h))
            ->toArray();

        foreach ($rows->slice($indexHeader + 1) as $index => $raw) {
            $baris = $index + 1; // nomor baris di Excel (slice mempertahankan key asli)

            try {
                DB::transaction(function () use ($raw, $headers, $baris) {
                    $arr = $raw->toArray();

                    if (count(array_filter($arr, fn ($v) => $v !== null && $v !== '')) === 0) {
                        return; // baris kosong
                    }

                    if (str_contains(strtolower(implode(' ', array_map('strval', $arr))), 'digenerate otomatis')) {
                        return; // footer hasil export
                    }

                    $row = array_combine(
                        $headers,
                        array_slice(array_pad($arr, count($headers), null), 0, count($headers))
                    );

                    $this->prosesBaris($row, $baris);
                });
            } catch (\Throwable $e) {
                $this->errors[] = 'Baris ' . $baris . ': ' . $e->getMessage();
            }
        }

        Log::info('IMPORT USER selesai', [
            'ditambahkan'  => $this->ditambahkan,
            'diperbarui'   => $this->diperbarui,
            'jumlah_error' => count($this->errors),
            'errors'       => $this->errors,
        ]);
    }

    private function cariBarisHeader(Collection $rows): ?int
    {
        $batas = min(self::MAX_BARIS_DISCAN, $rows->count());

        for ($i = 0; $i < $batas; $i++) {
            $sel = $rows[$i]->map(fn ($v) => $this->normalisasiHeader((string) $v));

            foreach (self::KOLOM_PENANDA_HEADER as $penanda) {
                if ($sel->contains($penanda)) {
                    return $i;
                }
            }
        }

        return null;
    }

    private function normalisasiHeader(string $h): string
    {
        $h = strtolower(trim($h));
        $h = preg_replace('/[\s\-]+/', '_', $h);
        $h = preg_replace('/[^a-z0-9_]/', '', $h);

        return trim($h, '_'); // "Tanggal Masuk" -> tanggal_masuk
    }

    // "12 Agu 2026", "21 Mei 2024", dst (format Indonesia) atau Y-m-d -> Y-m-d
    private function tanggal(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }

        if (is_numeric($v)) {
            return Date::excelToDateTimeObject($v)->format('Y-m-d');
        }

        $teks = trim((string) $v);

        if ($teks === '' || in_array(strtolower($teks), self::PLACEHOLDER, true)) {
            return null;
        }

        if (preg_match('/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/', $teks, $m)) {
            $bulan = self::BULAN[strtolower(substr($m[2], 0, 3))] ?? null;

            if ($bulan !== null) {
                return sprintf('%04d-%s-%02d', $m[3], $bulan, $m[1]);
            }
        }

        try {
            return Carbon::parse($teks)->format('Y-m-d');
        } catch (\Throwable) {
            $this->errors[] = 'Tanggal "' . $teks . '" tidak dapat dibaca, dikosongkan.';
            return null;
        }
    }

    private function statusDariLabel(?string $label): ?string
    {
        return match (str_replace([' ', '-', '_'], '', strtolower((string) $label))) {
            'aktif', 'active'                    => 'aktif',
            'nonaktif', 'tidakaktif', 'inactive' => 'nonaktif',
            default                              => null,
        };
    }

    private function prosesBaris(array $row, int $baris): void
    {
        if (count(array_filter($row, fn ($v) => $v !== null && $v !== '')) === 0) {
            return; // baris kosong
        }

        $nama        = $this->nilai($row['nama'] ?? $row['name'] ?? null);
        $email       = $this->nilai($row['email'] ?? null);
        $nik         = $this->nilai($row['nik'] ?? null);
        $password    = $this->nilai($row['password'] ?? null);
        $telepon     = $this->nilai($row['telepon'] ?? $row['phone'] ?? null);
        $statusLabel = $this->nilai($row['status'] ?? null);
        $status      = $this->statusDariLabel($statusLabel);

        if ($statusLabel !== null && $status === null) {
            throw new \RuntimeException('status "' . $statusLabel . '" harus Aktif atau Nonaktif');
        }

        if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('format email "' . $email . '" tidak valid');
        }

        if ($password !== null && strlen($password) < 8) {
            throw new \RuntimeException('password minimal 8 karakter'); // samakan dengan UserRequest
        }

        // Cari user yang sudah ada: NIK dulu, baru email
        $user = $nik !== null ? User::where('nik', $nik)->first() : null;

        if (!$user && $email !== null) {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
        }

        // Email sudah dipakai user LAIN?
        if ($email !== null && $user) {
            $dipakaiLain = User::whereRaw('LOWER(email) = ?', [strtolower($email)])
                ->where('id', '!=', $user->id)
                ->exists();

            if ($dipakaiLain) {
                throw new \RuntimeException('email "' . $email . '" sudah dipakai user lain');
            }
        }

        $atribut = array_filter([
            'name'          => $nama,
            'email'         => $email,
            'nik'           => $nik,
            'phone'         => $telepon,
            'status'        => $status,
            'tanggal_masuk' => $this->tanggal($row['tanggal_masuk'] ?? null),
            'role_id'       => $this->idDariNama(Role::class, $this->nilai($row['role'] ?? null)),
            'perusahaan_id' => $this->idDariNama(Perusahaan::class, $this->nilai($row['perusahaan'] ?? null)),
            'cabang_id'     => $this->idDariNama(Cabang::class, $this->nilai($row['cabang'] ?? $row['lokasi_kantor'] ?? null)),
            'departemen_id' => $this->idDariNama(Departemen::class, $this->nilai($row['departemen'] ?? null), true),
        ], fn ($v) => $v !== null); // kolom kosong = tidak mengubah data yang sudah ada

        if ($user) {
            if ($password !== null) {
                $atribut['password'] = $password; // di-hash oleh cast 'hashed' di model
            }

            $user->update($atribut);
            $this->diperbarui++;
            return;
        }

        // ---- user baru ----
        if ($nama === null) {
            throw new \RuntimeException('kolom Nama kosong');
        }

        if ($email === null) {
            throw new \RuntimeException('kolom Email kosong');
        }

        $atribut['role_id'] ??= $this->idDariNama(Role::class, 'User');
        $atribut['password'] = $password ?? $nama; // tanpa kolom password -> password = nama

        User::create($atribut);
        $this->ditambahkan++;
    }

    private function idDariNama(string $model, ?string $nama, bool $buatJikaBelumAda = false): ?int
    {
        if ($nama === null) {
            return null;
        }

        $kunci = $model . '|' . strtolower($nama);

        if (!array_key_exists($kunci, $this->cache)) {
            $id = $model::whereRaw('LOWER(nama) = ?', [strtolower($nama)])->value('id');

            if ($id === null && $buatJikaBelumAda) {
                $id = $model::create(['nama' => $nama])->id;
            }

            $this->cache[$kunci] = $id;
        }

        if ($this->cache[$kunci] === null) {
            throw new \RuntimeException(class_basename($model) . ' "' . $nama . '" tidak ditemukan');
        }

        return $this->cache[$kunci];
    }

    private function nilai(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }

        // NIK yang tersimpan sebagai angka di Excel terbaca float (mis. 3.2E+15)
        if (is_float($v)) {
            $v = sprintf('%.0f', $v);
        }

        $v = trim((string) $v);

        return ($v === '' || in_array(strtolower($v), self::PLACEHOLDER, true)) ? null : $v;
    }

    public function getRowCount(): int { return $this->ditambahkan; }
    public function getJumlahDiperbarui(): int { return $this->diperbarui; }
    public function getErrors(): array { return $this->errors; }
}