import { api } from '../lib/api';
import type { Penanganan } from '../types/penanganan';

export const penangananService = {
  // GET /inventory/{id}/penanganan (riwayat kerusakan & perbaikan satu barang, terbaru di atas)
  async riwayat(inventoryId: number): Promise<Penanganan[]> {
    const { data } = await api.get<Penanganan[]>(`/inventory/${inventoryId}/penanganan`);
    return data;
  },

  // POST /inventory/{id}/lapor-kerusakan (multipart karena ada 1 foto)
  async lapor(inventoryId: number, form: FormData): Promise<Penanganan> {
    const { data } = await api.post<Penanganan>(`/inventory/${inventoryId}/lapor-kerusakan`, form);
    return data;
  },
};