<?php

namespace App\Http\Requests\Transaksi;

use Illuminate\Foundation\Http\FormRequest;

class TerimaPenangananRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal_diterima' => ['required', 'date_format:Y-m-d'],
        ];
    }

    public function messages(): array
    {
        return [
            'tanggal_diterima.required' => 'Tanggal diterima wajib diisi.',
            'tanggal_diterima.date_format' => 'Format tanggal diterima tidak valid.',
        ];
    }
}