import type { Option } from './user';

// status inventory; `key` = nilai di database, `dot` = warna titik di Badge
export const INVENTORY_STATUSES = [
  { key: 'tersedia', label: 'Tersedia', dot: 'bg-success' },
  { key: 'dipakai', label: 'Dipakai', dot: 'bg-info' },
  { key: 'menunggu_perbaikan', label: 'Menunggu Perbaikan', dot: 'bg-warn' },
  { key: 'diperbaiki', label: 'Sedang Diperbaiki', dot: 'bg-accent' },
  { key: 'rusak_berat', label: 'Rusak Berat', dot: 'bg-danger' },
  { key: 'dijual', label: 'Dijual', dot: 'bg-ink-muted' },
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number]['key'];

export interface InventoryRow {
  id: number;
  kode_inventory: string;
  parent_id: number | null;
  kategori_id: number;
  nama: string | null;
  warna: string | null;
  serial_number: string | null;
  jumlah: number;
  tanggal_garansi: string | null; // 'YYYY-MM-DD'
  tanggal_input: string | null;
  tanggal_invoice: string | null;
  merk: string | null;
  type: string | null;
  perusahaan_id: number | null;
  keterangan: string | null;
  foto: string | null;
  foto_url: string | null; // URL foto dari server, null = belum ada foto
  supplier_id: number | null;
  no_surat_jalan: string | null;
  no_good_receive: string | null;
  status: InventoryStatus;
  kategori: Option | null;
  perusahaan: Option | null;
  supplier: Option | null;
  pemakai_saat_ini_id: number | null; // karyawan yang sedang memakai (barang utama dan kelengkapannya sama)
  parent: { id: number; kode_inventory: string; nama: string | null } | null;
  pemakai_saat_ini: { id: number; name: string } | null;
  children_count?: number; // > 0 = inventory ini barang utama (dari withCount di server)
}

// data yang dikirim saat tambah / ubah (kode_inventory dibuat otomatis oleh server)
export type InventoryPayload = Pick<
  InventoryRow,
  | 'parent_id' | 'kategori_id' | 'nama' | 'warna' | 'serial_number' | 'jumlah'
  | 'tanggal_garansi' | 'tanggal_input' | 'tanggal_invoice' | 'merk' | 'type'
  | 'perusahaan_id' | 'keterangan' | 'supplier_id' | 'no_surat_jalan' | 'no_good_receive'
>;

// isi semua dropdown di form inventory
export interface InventoryOptions {
  kategori: Option[];
  perusahaan: Option[];
  supplier: Option[];
  inventory: { id: number; kode_inventory: string; nama: string | null }[];
}

// satu kelengkapan yang terpasang di barang utama (daftar di modal Detail)
export interface InventoryKelengkapan {
  id: number;
  kode_inventory: string;
  nama: string | null;
  merk: string | null;
  type: string | null;
  serial_number: string | null;
  status: InventoryStatus;
}

// pilihan barang utama di modal Link
export interface InventoryLinkCandidate {
  id: number;
  kode_inventory: string;
  nama: string | null;
  merk: string | null;
  type: string | null;
  children_count: number;
  status: InventoryRow['status'];
}