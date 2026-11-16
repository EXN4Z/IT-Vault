<?php

namespace App\Http\Requests\Supplier;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, supplier yang sedang diubah dikecualikan dari cek unique
        $current = $this->route('supplier');

        return [
            'nama' => ['required', 'string', 'max:255', Rule::unique('supplier', 'nama')->ignore($current)],
            'alamat' => ['nullable', 'string', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama supplier wajib diisi.',
            'nama.max' => 'Nama supplier maksimal 255 karakter.',
            'nama.unique' => 'Nama supplier ini sudah ada.',
            'alamat.max' => 'Alamat maksimal 255 karakter.',
            'telepon.max' => 'Telepon maksimal 255 karakter.',
        ];
    }
}
