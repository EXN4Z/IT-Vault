<?php

namespace App\Http\Requests\Kategori;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KategoriRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, kategori yang sedang diubah dikecualikan dari cek unique
        $current = $this->route('kategori');

        return [
            'nama' => ['required', 'string', 'max:255', Rule::unique('kategori', 'nama')->ignore($current)],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama kategori wajib diisi.',
            'nama.max' => 'Nama kategori maksimal 255 karakter.',
            'nama.unique' => 'Nama kategori ini sudah ada.',
        ];
    }
}
