<?php

namespace App\Http\Requests\Cabang;

use App\Models\Cabang;
use Illuminate\Foundation\Http\FormRequest;

class CabangRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, cabang yang sedang diubah dikecualikan dari cek nama kembar
        $current = $this->route('cabang');

        return [
            'nama' => ['required', 'string', 'max:150', function (string $attribute, mixed $value, \Closure $fail) use ($current) {
                // nama dianggap sama walau beda huruf besar-kecil atau spasi di pinggir
                $exists = Cabang::query()
                    ->whereRaw('LOWER(nama) = ?', [mb_strtolower(trim($value))])
                    ->when($current, fn ($q) => $q->whereKeyNot($current->id))
                    ->exists();

                if ($exists) {
                    $fail('Nama cabang ini sudah dipakai cabang lain.');
                }
            }],
            'alamat' => ['nullable', 'string'],
            'link' => ['nullable', 'string', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:30'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama.required' => 'Nama cabang wajib diisi.',
            'nama.max' => 'Nama cabang maksimal 150 karakter.',
            'link.max' => 'Link maksimal 255 karakter.',
            'telepon.max' => 'Telepon maksimal 30 karakter.',
        ];
    }
}