import { api } from '../lib/api';
import type { MyInventory, RiwayatPerbaikan } from '../types/myInventory';
import type { Paginated } from '../types/user';
import type { PengembalianReceipt } from '../types/peminjaman';

export const myInventoryService = {
  // GET /my/inventory (barang utama yang sedang dipakai user yang login)
  async list(): Promise<MyInventory[]> {
    const { data } = await api.get<MyInventory[]>('/my/inventory');
    return data;
  },

  // GET /my/riwayat-perbaikan?page=1&per_page=2 (perbaikan selesai pada barang user, terbaru di atas)
  async riwayatPerbaikan(page: number, perPage: number): Promise<Paginated<RiwayatPerbaikan>> {
    const { data } = await api.get<Paginated<RiwayatPerbaikan>>('/my/riwayat-perbaikan', {
      params: { page, per_page: perPage },
    });
    return data;
  },

  // POST /inventory/{id}/kembalikan (route yang sama dengan admin; server membatasi user ke barangnya sendiri)
  // multipart karena ada 3 foto kondisi barang
  async kembalikan(inventoryId: number, form: FormData): Promise<PengembalianReceipt> {
    const { data } = await api.post<PengembalianReceipt>(`/inventory/${inventoryId}/kembalikan`, form);
    return data;
  },
};