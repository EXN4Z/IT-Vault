import type { InventoryStatus } from './inventory';

// penanganan kerusakan yang masih berjalan untuk satu barang
export interface MyPenanganan {
  id: number;
  status: 'dilaporkan' | 'diterima';
  jenis_label: string;
  tanggal_lapor: string; // 'YYYY-MM-DD'
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
  status: InventoryStatus;
  penanganan: MyPenanganan | null;
  bisa_dilapor: boolean;
}

// barang utama yang sedang dipakai user, lengkap dengan kelengkapannya
export interface MyInventory extends MyInventoryItem {
  kategori: string | null;
  nomor_penerimaan: string | null;
  tanggal_penerimaan: string | null; // 'YYYY-MM-DD'
  catatan: string | null;
  bisa_dikembalikan: boolean;
  kelengkapan: MyInventoryItem[];
}

// data yang dikirim user saat mengembalikan (nomor penerimaan tidak diminta dari user)
export interface MyKembalikanPayload {
  tanggal_pengembalian: string; // 'YYYY-MM-DD'
  catatan: string | null;
}
