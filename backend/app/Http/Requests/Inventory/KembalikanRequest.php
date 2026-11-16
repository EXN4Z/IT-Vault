<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class KembalikanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // kode peminjaman dari struk serah terima; dicocokkan dengan peminjaman barang ini di controller
            'nomor_penerimaan' => ['required', 'string', 'max:50'],
            'tanggal_pengembalian' => ['required', 'date_format:Y-m-d'],
            'catatan' => ['nullable', 'string', 'max:1000'],
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
        ];
    }
}