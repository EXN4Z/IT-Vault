<?php

namespace App\Http\Requests\Cabang;

use Illuminate\Foundation\Http\FormRequest;

// validasi file untuk POST /cabang/import
class CabangImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120'], // maks. 5 MB
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File wajib dipilih.',
            'file.mimes' => 'Format file harus .xlsx, .xls, atau .csv.',
            'file.max' => 'Ukuran file maksimal 5 MB.',
        ];
    }
}