import type { InventoryStatus } from './inventory';

// penanganan kerusakan satu barang: yang masih berjalan, atau yang baru selesai (kurang dari 24 jam)
export interface MyPenanganan {
  id: number;
  status: 'dilaporkan' | 'diterima' | 'selesai';
  jenis_label: string;
  tanggal_lapor: string; // 'YYYY-MM-DD'
  lapor_at: string | null; // ISO 8601, jamnya diformat di browser
  tanggal_selesai: string | null; // terisi kalau status selesai
  selesai_at: string | null;
  hasil: 'berhasil' | 'tidak_bisa_diperbaiki' | null;
}

// satu baris riwayat perbaikan yang sudah selesai (dashboard user, berpaginasi)
export interface RiwayatPerbaikan {
  id: number;
  kode_inventory: string | null;
  nama: string | null;
  jenis_label: string;
  keluhan: string;
  hasil: 'berhasil' | 'tidak_bisa_diperbaiki' | null;
  catatan: string | null;
  tanggal_lapor: string;
  lapor_at: string | null;
  tanggal_selesai: string | null;
  selesai_at: string | null;
}

// satu barang (utama atau kelengkapan) di dashboard user, sama dengan itemPayload() di MyInventoryController
export interface MyInventoryItem {
  id: number;
  kode_inventory: string;
  nama: string | null;
  merk: string | null;
  type: string | null;
  warna: string | null;
  serial_number: string | null;
  foto_url: string | null; // null = belum ada foto (tampil placeholder)
  status: InventoryStatus;
  penanganan: MyPenanganan | null; // yang masih berjalan
  penanganan_selesai: MyPenanganan | null; // yang selesai kurang dari 24 jam lalu
  bisa_dilapor: boolean;
}

// barang utama yang sedang dipakai user, lengkap dengan kelengkapannya
export interface MyInventory extends MyInventoryItem {
  kategori: string | null;
  nomor_penerimaan: string | null;
  tanggal_penerimaan: string | null; // 'YYYY-MM-DD'
  waktu_penerimaan: string | null; // ISO 8601, jam pencatatan serah terima
  catatan: string | null;
  bisa_dikembalikan: boolean;
  kelengkapan: MyInventoryItem[];
}

// data yang dikirim user saat mengembalikan (nomor penerimaan tidak diminta dari user)
export interface MyKembalikanPayload {
  tanggal_pengembalian: string; // 'YYYY-MM-DD'
  catatan: string | null;
}