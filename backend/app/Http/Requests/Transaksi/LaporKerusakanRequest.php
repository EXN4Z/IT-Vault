<?php

namespace App\Http\Requests\Transaksi;

use App\Models\Penanganan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LaporKerusakanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jenis_kerusakan' => ['required', Rule::in(array_keys(Penanganan::JENIS))],
            'keluhan' => ['required', 'string', 'max:2000'],
            'tanggal_lapor' => ['required', 'date_format:Y-m-d'],
            // foto kerusakan: wajib 1
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'jenis_kerusakan.required' => 'Jenis kerusakan wajib dipilih.',
            'jenis_kerusakan.in' => 'Jenis kerusakan tidak valid.',
            'keluhan.required' => 'Keluhan wajib diisi.',
            'keluhan.max' => 'Keluhan maksimal 2000 karakter.',
            'tanggal_lapor.required' => 'Tanggal lapor wajib diisi.',
            'tanggal_lapor.date_format' => 'Format tanggal lapor tidak valid.',
            'foto.required' => 'Foto kerusakan wajib diisi.',
            'foto.image' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.mimes' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
            'foto.uploaded' => 'Foto gagal diunggah. Cek ukuran foto (maksimal 5 MB) lalu coba lagi.',
        ];
    }
}