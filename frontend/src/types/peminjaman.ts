// satu pilihan di "Cari Karyawan Pemakai"
export interface KaryawanOption {
  id: number;
  name: string;
  nik: string | null;
}

// satu baris barang di struk (barang utama atau kelengkapan)
export interface StrukInventory {
  id: number;
  kode_inventory: string;
  nama: string | null;
  merk: string | null;
  type: string | null;
  warna: string | null;
  status?: string; // hanya ada di data struk serah terima (dipakai modal Kembalikan untuk kondisi awal)
}

// balasan server setelah serah terima berhasil, dipakai untuk mencetak struk
export interface SerahTerimaReceipt {
  nomor_penerimaan: string;
  tanggal_penerimaan: string; // 'YYYY-MM-DD'
  catatan: string | null;
  pemakai: { id: number; name: string };
  inventory: StrukInventory;
  kelengkapan: StrukInventory[];
}

// kondisi barang setelah dikembalikan; `key` = nilai status di database
export const KONDISI_KEMBALI = [
  { key: 'tersedia', label: 'Tersedia' },
  { key: 'menunggu_perbaikan', label: 'Menunggu Perbaikan' },
  { key: 'diperbaiki', label: 'Sedang Diperbaiki' },
  { key: 'rusak_berat', label: 'Rusak Berat' },
] as const;

export type KondisiKembali = (typeof KONDISI_KEMBALI)[number]['key'];

// satu barang di struk pengembalian
export interface PengembalianItem extends StrukInventory {
  kondisi_kembali: string | null;
}

// data yang dikirim saat mengembalikan
export interface KembalikanPayload {
  nomor_penerimaan: string;
  tanggal_pengembalian: string; // 'YYYY-MM-DD'
  catatan: string | null;
}

// balasan server setelah pengembalian berhasil (juga untuk cetak ulang dari riwayat)
export interface PengembalianReceipt {
  nomor_penerimaan: string;
  tanggal_penerimaan: string;
  tanggal_pengembalian: string;
  catatan: string | null;
  catatan_kembali: string | null;
  pemakai: { id: number; name: string };
  inventory: PengembalianItem;
  kelengkapan: PengembalianItem[];
}

// satu baris di modal Riwayat (peminjaman sebagai barang utama, atau jejak sebagai kelengkapan)
export interface RiwayatRow {
  id: string;
  peran: 'utama' | 'kelengkapan';
  pemakai_id: number;
  nomor_penerimaan: string;
  tanggal_penerimaan: string;
  tanggal_pengembalian: string | null;
  waktu_penerimaan: string | null; // ISO 8601 (UTC), untuk menampilkan jam
  waktu_pengembalian: string | null;
  pemakai: string | null;
  induk: { id: number; kode_inventory: string; nama: string | null } | null; // barang utama (untuk peran kelengkapan)
  keterangan: string | null;
  catatan_kembali: string | null;
  berjalan: boolean;
  bisa_cetak_pengembalian: boolean;
}