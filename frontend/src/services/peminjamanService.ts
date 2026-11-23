import { api } from '../lib/api';
import type { KaryawanOption, PengembalianReceipt, RiwayatRow, SerahTerimaReceipt } from '../types/peminjaman';

export const peminjamanService = {
  // GET /pemakai/karyawan (karyawan aktif, untuk "Cari Karyawan Pemakai")
  async karyawan(): Promise<KaryawanOption[]> {
    const { data } = await api.get<KaryawanOption[]>('/pemakai/karyawan');
    return data;
  },

  // POST /inventory/{id}/serahkan (multipart karena ada 3 foto)
  async serahkan(inventoryId: number, form: FormData): Promise<SerahTerimaReceipt> {
    const { data } = await api.post<SerahTerimaReceipt>(`/inventory/${inventoryId}/serahkan`, form);
    return data;
  },

  // GET /inventory/{id}/struk (cetak ulang struk; nomor tetap, kelengkapan sesuai kondisi terbaru)
  async struk(inventoryId: number): Promise<SerahTerimaReceipt> {
    const { data } = await api.get<SerahTerimaReceipt>(`/inventory/${inventoryId}/struk`);
    return data;
  },

  // POST /inventory/{id}/kembalikan (multipart karena ada 3 foto; butuh nomor penerimaan; balasannya data struk pengembalian)
  async kembalikan(inventoryId: number, form: FormData): Promise<PengembalianReceipt> {
    const { data } = await api.post<PengembalianReceipt>(`/inventory/${inventoryId}/kembalikan`, form);
    return data;
  },

  // GET /pemakai/{id}/struk-pengembalian (cetak ulang struk pengembalian dari riwayat)
  async strukPengembalian(pemakaiId: number): Promise<PengembalianReceipt> {
    const { data } = await api.get<PengembalianReceipt>(`/pemakai/${pemakaiId}/struk-pengembalian`);
    return data;
  },

  // GET /inventory/{id}/riwayat (peminjaman sebagai barang utama dan sebagai kelengkapan)
  async riwayat(inventoryId: number): Promise<RiwayatRow[]> {
    const { data } = await api.get<RiwayatRow[]>(`/inventory/${inventoryId}/riwayat`);
    return data;
  },
};