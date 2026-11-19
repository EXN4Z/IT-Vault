<?php

namespace App\Http\Requests\DataUser;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, user yang sedang diubah dikecualikan dari cek unique
        $current = $this->route('user');

        // password wajib saat tambah baru; saat ubah boleh kosong (= tidak diganti)
        $passwordRule = $this->isMethod('post') ? 'required' : 'nullable';

        return [
            // nama ikut dipakai untuk login ("email atau nama"), jadi harus unik
            'name' => ['required', 'string', 'max:255', Rule::unique('users', 'name')->ignore($current)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($current)],
            'password' => [$passwordRule, 'string', 'min:8', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'nik' => ['nullable', 'string', 'max:255'],
            'tanggal_masuk' => ['nullable', 'date'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'cabang_id' => ['nullable', 'integer', 'exists:cabang,id'],
            'departemen_id' => ['nullable', 'integer', 'exists:departemen,id'],
            'perusahaan_id' => ['nullable', 'integer', 'exists:perusahaan,id'],
            'status' => ['required', Rule::in(['aktif', 'nonaktif']), function (string $attribute, mixed $value, \Closure $fail) use ($current) {
                // hanya saat berpindah dari aktif ke nonaktif; user yang sudah nonaktif tetap bisa diedit datanya
                if ($value === 'nonaktif' && $current && $current->status !== 'nonaktif' && ($error = $current->nonaktifError())) {
                    $fail($error);
                }
            }],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'name.unique' => 'Nama ini sudah dipakai user lain.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah dipakai user lain.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
            'phone.max' => 'Telepon maksimal 30 karakter.',
            'tanggal_masuk.date' => 'Tanggal masuk tidak valid.',
            'role_id.required' => 'Role wajib dipilih.',
            'role_id.exists' => 'Role tidak ditemukan.',
            'cabang_id.exists' => 'Cabang tidak ditemukan.',
            'departemen_id.exists' => 'Departemen tidak ditemukan.',
            'perusahaan_id.exists' => 'Perusahaan tidak ditemukan.',
            'status.in' => 'Status harus aktif atau nonaktif.',
        ];
    }
}