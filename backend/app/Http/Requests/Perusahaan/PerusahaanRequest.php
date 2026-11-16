<?php

namespace App\Http\Requests\Perusahaan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PerusahaanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, perusahaan yang sedang diubah dikecualikan dari cek unique
        $current = $this->route('perusahaan');

        return [
            'nama' => ['required', 'string', 'max:150'],
            'alamat' => ['nullable', 'string', Rule::unique('perusahaan', 'alamat')->ignore($current)],
            'link' => ['nullable', 'string', 'max:255', Rule::unique('perusahaan', 'link')->ignore($current)],
            'telepon' => ['nullable', 'string', 'max:30'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama perusahaan wajib diisi.',
            'nama.max' => 'Nama perusahaan maksimal 150 karakter.',
            'alamat.unique' => 'Alamat ini sudah dipakai perusahaan lain.',
            'link.unique' => 'Link ini sudah dipakai perusahaan lain.',
            'link.max' => 'Link maksimal 255 karakter.',
            'telepon.max' => 'Telepon maksimal 30 karakter.',
        ];
    }
}