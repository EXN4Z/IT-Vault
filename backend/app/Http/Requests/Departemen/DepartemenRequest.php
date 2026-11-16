<?php

namespace App\Http\Requests\Departemen;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartemenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, departemen yang sedang diubah dikecualikan dari cek unique
        $current = $this->route('departemen');

        return [
            'nama' => ['required', 'string', 'max:255', Rule::unique('departemen', 'nama')->ignore($current)],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama departemen wajib diisi.',
            'nama.max' => 'Nama departemen maksimal 255 karakter.',
            'nama.unique' => 'Nama departemen ini sudah ada.',
        ];
    }
}