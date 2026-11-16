<?php

namespace App\Http\Requests\Cabang;

use App\Exports\CabangExport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// validasi parameter GET /cabang/export
class CabangExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // format file
            'format' => ['required', Rule::in(['xlsx', 'csv'])],

            // cakupan data: semua / hasil pencarian / satu halaman tabel
            'scope' => ['required', Rule::in(['all', 'filtered', 'page'])],

            // kata kunci pencarian (dipakai kalau scope = filtered atau page)
            'search' => ['nullable', 'string'],

            // posisi halaman (wajib hanya kalau scope = page)
            'page' => ['required_if:scope,page', 'integer', 'min:1'],
            'per_page' => ['required_if:scope,page', 'integer', 'min:1', 'max:100'],

            // kolom yang dipilih, minimal satu dan harus termasuk daftar kolom baku
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(CabangExport::columnKeys())],
        ];
    }
}