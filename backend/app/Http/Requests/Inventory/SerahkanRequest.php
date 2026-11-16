<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SerahkanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // hanya karyawan yang masih aktif
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->where('status', 'aktif')],
            'tanggal_penerimaan' => ['required', 'date_format:Y-m-d'],
            'catatan' => ['nullable', 'string', 'max:1000'],
            // foto bukti: wajib tepat 3
            'foto' => ['required', 'array', 'size:3'],
            'foto.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Pilih karyawan peminjam dulu.',
            'user_id.exists' => 'Karyawan peminjam tidak ditemukan atau sudah tidak aktif.',
            'tanggal_penerimaan.required' => 'Tanggal penerimaan wajib diisi.',
            'tanggal_penerimaan.date_format' => 'Format tanggal penerimaan tidak valid.',
            'catatan.max' => 'Catatan serah terima maksimal 1000 karakter.',
            'foto.required' => 'Foto barang bukti peminjaman wajib diisi (3 foto).',
            'foto.array' => 'Foto barang bukti peminjaman wajib diisi (3 foto).',
            'foto.size' => 'Foto barang bukti peminjaman harus tepat 3 foto.',
            'foto.*.required' => 'Foto barang bukti peminjaman harus tepat 3 foto.',
            'foto.*.image' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.*.mimes' => 'File foto harus berupa gambar (jpg, jpeg, png, atau webp).',
            'foto.*.max' => 'Ukuran tiap foto maksimal 5 MB.',
            'foto.*.uploaded' => 'Foto gagal diunggah. Cek ukuran foto (maksimal 5 MB) lalu coba lagi.',
        ];
    }
}