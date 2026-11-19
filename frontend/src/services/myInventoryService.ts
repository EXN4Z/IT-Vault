import { api } from '../lib/api';
import type { MyInventory, MyKembalikanPayload } from '../types/myInventory';
import type { PengembalianReceipt } from '../types/peminjaman';

export const myInventoryService = {
  // GET /my/inventory (barang utama yang sedang dipakai user yang login)
  async list(): Promise<MyInventory[]> {
    const { data } = await api.get<MyInventory[]>('/my/inventory');
    return data;
  },

  // POST /inventory/{id}/kembalikan (route yang sama dengan admin; server membatasi user ke barangnya sendiri)
  async kembalikan(inventoryId: number, payload: MyKembalikanPayload): Promise<PengembalianReceipt> {
    const { data } = await api.post<PengembalianReceipt>(`/inventory/${inventoryId}/kembalikan`, payload);
    return data;
  },
};
