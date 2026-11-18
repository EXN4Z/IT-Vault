// jenis kerusakan; `key` = nilai di database (sama dengan Penanganan::JENIS di backend)
export const JENIS_KERUSAKAN = [
  { key: 'software', label: 'Software' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'tidak_berfungsi', label: 'Tidak Berfungsi' },
  { key: 'hancur', label: 'Hancur' },
  { key: 'terputus_sobek', label: 'Terputus / Sobek' },
] as const;

export type JenisKerusakan = (typeof JENIS_KERUSAKAN)[number]['key'];

// status penanganan; `dot` = warna titik di Badge
export const STATUS_PENANGANAN = [
  { key: 'dilaporkan', label: 'Dilaporkan', dot: 'bg-warn' },
  { key: 'diterima', label: 'Diproses', dot: 'bg-accent' },
  { key: 'selesai', label: 'Selesai', dot: 'bg-success' },
  { key: 'dibatalkan', label: 'Dibatalkan', dot: 'bg-ink-muted' },
] as const;

export type StatusPenanganan = (typeof STATUS_PENANGANAN)[number]['key'];

// hasil akhir perbaikan (diisi saat Selesaikan)
export const HASIL_PENANGANAN = [
  { key: 'berhasil', label: 'Berhasil diperbaiki' },
  { key: 'tidak_bisa_diperbaiki', label: 'Tidak bisa diperbaiki' },
] as const;

export type HasilPenanganan = (typeof HASIL_PENANGANAN)[number]['key'];

// satu penanganan, sama dengan payload() di PenangananController
export interface Penanganan {
  id: number;
  inventory_id: number;
  // hanya terisi di daftar halaman Penanganan
  inventory: {
    id: number;
    kode_inventory: string;
    nama: string | null;
    merk: string | null;
    type: string | null;
    serial_number: string | null;
    warna: string | null;
  } | null;
  pemakai_id: number | null;
  status: StatusPenanganan;
  status_sebelum: string;
  jenis_kerusakan: JenisKerusakan;
  jenis_label: string;
  keluhan: string;
  foto_url: string;
  tanggal_lapor: string; // 'YYYY-MM-DD'
  lapor_at: string | null; // ISO 8601, jamnya diformat di browser
  tanggal_diterima: string | null;
  diterima_at: string | null;
  tanggal_selesai: string | null;
  selesai_at: string | null;
  harga_jasa: string | null; // decimal dari server, dikirim sebagai string ('150000.00')
  biaya_komponen: string | null;
  hasil: 'berhasil' | 'tidak_bisa_diperbaiki' | null;
  no_struk: string | null;
  catatan: string | null;
  pelapor: string | null;
  penerima: string | null;
}

// tab halaman Penanganan; `key` = nilai ?status= yang dikirim ke server
export const TAB_PENANGANAN = [
  { key: 'menunggu', label: 'Menunggu Terima' },
  { key: 'diproses', label: 'Sedang Diperbaiki' },
  { key: 'berhasil', label: 'Berhasil Diperbaiki' },
  { key: 'rusak_berat', label: 'Rusak Berat' },
] as const;

export type TabPenanganan = (typeof TAB_PENANGANAN)[number]['key'];