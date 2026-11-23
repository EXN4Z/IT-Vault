<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KembalikanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // kode pemakai dari struk serah terima; dicocokkan dengan pemakai barang ini di controller.
            // wajib untuk admin saja: user yang mengembalikan barangnya sendiri sudah terbukti lewat login
            'nomor_penerimaan' => [
                Rule::requiredIf(fn () => $this->user()?->role?->nama === 'admin'),
                'nullable', 'string', 'max:50',
            ],
            'tanggal_pengembalian' => ['required', 'date_format:Y-m-d'],
            'catatan' => ['nullable', 'string', 'max:1000'],
            // foto bukti kondisi barang saat dikembalikan: wajib tepat 3 (admin maupun user)
            'foto' => ['required', 'array', 'size:3'],
            'foto.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'nomor_penerimaan.required' => 'Nomor penerimaan wajib diisi.',
            'nomor_penerimaan.max' => 'Nomor penerimaan maksimal 50 karakter.',
            'tanggal_pengembalian.required' => 'Tanggal pengembalian wajib diisi.',
            'tanggal_pengembalian.date_format' => 'Format tanggal pengembalian tidak valid.',
            'catatan.max' => 'Catatan kembali maksimal 1000 karakter.',
            'foto.required' => 'Foto kondisi barang saat dikembalikan wajib diisi (3 foto).',
            'foto.array' => 'Foto kondisi barang saat dikembalikan wajib diisi (3 foto).',
            'foto.size' => 'Foto kondisi barang saat dikembalikan harus tepat 3 foto.',
            'foto.*.required' => 'Foto kondisi barang saat dikembalikan harus tepat 3 foto.',
            'foto.*.image' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.*.mimes' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.*.max' => 'Ukuran tiap foto maksimal 5 MB.',
            'foto.*.uploaded' => 'Foto gagal diunggah. Cek ukuran foto (maksimal 5 MB) lalu coba lagi.',
        ];
    }
}