export type JenisFotoLaporan = 'semua' | 'pemakai' | 'pengembalian' | 'rusak';

export interface LaporanFotoItem {
  id: string;
  jenis: Exclude<JenisFotoLaporan, 'semua'>;
  jenis_label: string;
  referensi: string;
  tanggal: string | null;
  waktu: string | null;
  pelaku: string;
  keterangan: string | null;
  inventory: {
    id: number;
    kode_inventory: string;
    nama: string;
    merk: string | null;
    type: string | null;
  } | null;
  foto_urls: string[];
}