<?php

namespace App\Http\Requests\Transaksi;

use Illuminate\Foundation\Http\FormRequest;

class SelesaikanPenangananRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hasil' => ['required', 'in:berhasil,tidak_bisa_diperbaiki'],
            'tanggal_selesai' => ['required', 'date_format:Y-m-d'],
            // kolom decimal(12,2): maksimal 9.999.999.999,99
            // wajib diisi (boleh 0) kalau berhasil diperbaiki; kalau rusak berat boleh kosong
            'harga_jasa' => ['required_if:hasil,berhasil', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'biaya_komponen' => ['required_if:hasil,berhasil', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            // alasan wajib kalau barang tidak bisa diperbaiki
            'catatan' => ['required_if:hasil,tidak_bisa_diperbaiki', 'nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'hasil.required' => 'Hasil perbaikan wajib dipilih.',
            'hasil.in' => 'Hasil perbaikan tidak valid.',
            'tanggal_selesai.required' => 'Tanggal selesai wajib diisi.',
            'tanggal_selesai.date_format' => 'Format tanggal selesai tidak valid.',
            'harga_jasa.required_if' => 'Harga jasa wajib diisi kalau hasilnya berhasil diperbaiki.',
            'harga_jasa.numeric' => 'Harga jasa harus berupa angka.',
            'harga_jasa.min' => 'Harga jasa tidak boleh negatif.',
            'harga_jasa.max' => 'Harga jasa terlalu besar.',
            'biaya_komponen.required_if' => 'Biaya komponen wajib diisi kalau hasilnya berhasil diperbaiki.',
            'biaya_komponen.numeric' => 'Biaya komponen harus berupa angka.',
            'biaya_komponen.min' => 'Biaya komponen tidak boleh negatif.',
            'biaya_komponen.max' => 'Biaya komponen terlalu besar.',
            'catatan.required_if' => 'Catatan (alasan tidak bisa diperbaiki) wajib diisi.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}