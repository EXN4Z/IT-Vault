import { api } from '../lib/api';
import type { Penanganan } from '../types/penanganan';
import type { Paginated } from '../types/user';

// daftar halaman Penanganan: paginasi biasa + jumlah laporan yang belum diterima lewat 7 hari
export type PenangananList = Paginated<Penanganan> & { terlambat: number };

export const penangananService = {
  // GET /penanganan?status=menunggu&jenis=&search=...
  async list(page: number, perPage: number, status: string, jenis?: string, search?: string): Promise<PenangananList> {
    const { data } = await api.get<PenangananList>('/penanganan', {
      params: { page, per_page: perPage, status, jenis: jenis || undefined, search: search || undefined },
    });
    return data;
  },

  // GET /inventory/{id}/penanganan (riwayat kerusakan & perbaikan satu barang, terbaru di atas)
  async riwayat(inventoryId: number): Promise<Penanganan[]> {
    const { data } = await api.get<Penanganan[]>(`/inventory/${inventoryId}/penanganan`);
    return data;
  },

  // POST /penanganan/{id}/terima (laporan diterima untuk diperbaiki; penerima = user yang login)
  async terima(id: number, tanggalDiterima: string): Promise<Penanganan> {
    const { data } = await api.post<Penanganan>(`/penanganan/${id}/terima`, { tanggal_diterima: tanggalDiterima });
    return data;
  },

  // POST /inventory/{id}/lapor-kerusakan (multipart karena ada 1 foto)
  async lapor(inventoryId: number, form: FormData): Promise<Penanganan> {
    const { data } = await api.post<Penanganan>(`/inventory/${inventoryId}/lapor-kerusakan`, form);
    return data;
  },
};