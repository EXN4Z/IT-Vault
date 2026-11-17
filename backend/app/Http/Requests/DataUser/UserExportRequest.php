<?php

namespace App\Http\Requests\DataUser;

use App\Exports\UserExport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// validasi parameter GET /users/export
class UserExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'format' => ['required', Rule::in(['xlsx', 'csv'])],
            'scope' => ['required', Rule::in(['all', 'filtered', 'page'])],
            'role' => ['nullable', Rule::in(['user', 'admin'])], // tab yang sedang aktif
            'search' => ['nullable', 'string'],
            'page' => ['required_if:scope,page', 'integer', 'min:1'],
            'per_page' => ['required_if:scope,page', 'integer', 'min:1', 'max:100'],
            'columns' => ['required', 'array', 'min:1'],
            'columns.*' => ['string', Rule::in(UserExport::columnKeys())],
        ];
    }
}