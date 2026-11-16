import { api } from '../lib/api';
import type { Kategori, KategoriPayload } from '../types/kategori';
import type { Paginated } from '../types/user';

export const kategoriService = {
  // GET /kategori?search=...
  async list(page: number, perPage: number, search?: string): Promise<Paginated<Kategori>> {
    const { data } = await api.get<Paginated<Kategori>>('/kategori', {
      params: { page, per_page: perPage, search: search || undefined },
    });
    return data;
  },

  // POST /kategori
  async create(payload: KategoriPayload): Promise<Kategori> {
    const { data } = await api.post<Kategori>('/kategori', payload);
    return data;
  },

  // PUT /kategori/{id}
  async update(id: number, payload: KategoriPayload): Promise<Kategori> {
    const { data } = await api.put<Kategori>(`/kategori/${id}`, payload);
    return data;
  },

  // DELETE /kategori/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/kategori/${id}`);
  },
};