<?php

namespace App\Http\Requests\Inventory;

use App\Models\Inventory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InventoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // saat update, inventory yang sedang diubah dikecualikan dari cek unique dan dari pilihan barang utama
        $current = $this->route('inventory');
        $notSelf = $current ? [Rule::notIn([$current->id])] : [];

        return [
            'parent_id' => ['nullable', 'integer', 'exists:inventory,id', ...$notSelf, function (string $attribute, mixed $value, \Closure $fail) use ($current) {
                $parent = Inventory::find($value);
                if (! $parent) {
                    return; // 'exists' yang melaporkan
                }

                // ubah: pakai aturan link yang sama dengan tombol Link; tambah: barang utama tidak boleh sudah jadi kelengkapan
                $error = $current
                    ? $current->linkError($parent)
                    : ($parent->parent_id !== null ? 'Inventory tujuan sudah jadi kelengkapan dari inventory lain, jadi tidak bisa dijadikan barang utama.' : null);

                if ($error) {
                    $fail($error);
                }
            }],
            'kategori_id' => ['required', 'integer', 'exists:kategori,id'],
            'nama' => ['nullable', 'string', 'max:255'],
            'warna' => ['nullable', 'string', 'max:255'],
            'serial_number' => ['nullable', 'string', 'max:255', Rule::unique('inventory', 'serial_number')->ignore($current)],
            'jumlah' => ['required', 'integer', 'min:1'],
            'tanggal_garansi' => ['nullable', 'date_format:Y-m-d'],
            'tanggal_input' => ['nullable', 'date_format:Y-m-d'],
            'tanggal_invoice' => ['nullable', 'date_format:Y-m-d'],
            'merk' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'max:100'],
            'perusahaan_id' => ['nullable', 'integer', 'exists:perusahaan,id'],
            'supplier_id' => ['nullable', 'integer', 'exists:supplier,id'],
            'keterangan' => ['nullable', 'string'],
            'no_surat_jalan' => ['nullable', 'string', 'max:255'],
            'no_good_receive' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'parent_id.exists' => 'Barang utama tidak ditemukan.',
            'parent_id.not_in' => 'Inventory tidak bisa jadi barang utama dirinya sendiri.',
            'kategori_id.required' => 'Kategori wajib dipilih.',
            'kategori_id.exists' => 'Kategori tidak ditemukan.',
            'nama.max' => 'Nama maksimal 255 karakter.',
            'serial_number.unique' => 'Serial number ini sudah dipakai inventory lain.',
            'serial_number.max' => 'Serial number maksimal 255 karakter.',
            'jumlah.required' => 'Jumlah wajib diisi.',
            'jumlah.integer' => 'Jumlah harus berupa angka bulat.',
            'jumlah.min' => 'Jumlah minimal 1.',
            'tanggal_garansi.date_format' => 'Format tanggal garansi tidak valid.',
            'tanggal_input.date_format' => 'Format tanggal input tidak valid.',
            'tanggal_invoice.date_format' => 'Format tanggal invoice tidak valid.',
            'merk.max' => 'Merk maksimal 100 karakter.',
            'type.max' => 'Type maksimal 100 karakter.',
            'perusahaan_id.exists' => 'Perusahaan tidak ditemukan.',
            'supplier_id.exists' => 'Supplier tidak ditemukan.',
        ];
    }
}