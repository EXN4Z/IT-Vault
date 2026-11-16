import { api } from '../lib/api';
import type { InventoryKelengkapan, InventoryLinkCandidate, InventoryOptions, InventoryPayload, InventoryRow } from '../types/inventory';
import type { Paginated } from '../types/user';

export const inventoryService = {
  // GET /inventory?status=tersedia&search=...
  async list(page: number, perPage: number, status?: string, search?: string): Promise<Paginated<InventoryRow>> {
    const { data } = await api.get<Paginated<InventoryRow>>('/inventory', {
      params: { page, per_page: perPage, status, search: search || undefined }, // undefined -> nggak ikut dikirim
    });
    return data;
  },

  // GET /inventory/options (isi dropdown kategori, perusahaan, supplier, induk)
  async options(): Promise<InventoryOptions> {
    const { data } = await api.get<InventoryOptions>('/inventory/options');
    return data;
  },

  // GET /inventory/{id}/link-candidates?search=... (pilihan induk, tanpa dirinya sendiri dan tanpa yang sudah jadi anak)
  async linkCandidates(id: number, search?: string): Promise<InventoryLinkCandidate[]> {
    const { data } = await api.get<InventoryLinkCandidate[]>(`/inventory/${id}/link-candidates`, {
      params: { search: search || undefined },
    });
    return data;
  },

  // POST /inventory/{id}/link -> jadikan anak dari parentId
  async link(id: number, parentId: number): Promise<InventoryRow> {
    const { data } = await api.post<InventoryRow>(`/inventory/${id}/link`, { parent_id: parentId });
    return data;
  },

  // DELETE /inventory/{id}/link -> lepas dari induk
  async unlink(id: number): Promise<InventoryRow> {
    const { data } = await api.delete<InventoryRow>(`/inventory/${id}/link`);
    return data;
  },

  // GET /inventory/{id}/kelengkapan (kelengkapan yang sedang terpasang di barang utama ini)
  async kelengkapan(id: number): Promise<InventoryKelengkapan[]> {
    const { data } = await api.get<InventoryKelengkapan[]>(`/inventory/${id}/kelengkapan`);
    return data;
  },

  // POST /inventory
  async create(payload: InventoryPayload): Promise<InventoryRow> {
    const { data } = await api.post<InventoryRow>('/inventory', payload);
    return data;
  },

  // PUT /inventory/{id}
  async update(id: number, payload: InventoryPayload): Promise<InventoryRow> {
    const { data } = await api.put<InventoryRow>(`/inventory/${id}`, payload);
    return data;
  },

  // POST /inventory/{id}/jual -> status jadi dijual (hanya Rusak Berat tanpa kelengkapan yang masih nempel)
  async jual(id: number): Promise<InventoryRow> {
    const { data } = await api.post<InventoryRow>(`/inventory/${id}/jual`);
    return data;
  },

  // DELETE /inventory/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/inventory/${id}`);
  },
};