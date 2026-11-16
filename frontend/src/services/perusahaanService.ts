import { api } from '../lib/api';
import type { Perusahaan, PerusahaanPayload } from '../types/perusahaan';
import type { Paginated } from '../types/user';

export const perusahaanService = {
  // GET /perusahaan?search=...
  async list(page: number, perPage: number, search?: string): Promise<Paginated<Perusahaan>> {
    const { data } = await api.get<Paginated<Perusahaan>>('/perusahaan', {
      params: { page, per_page: perPage, search: search || undefined },
    });
    return data;
  },

  // POST /perusahaan
  async create(payload: PerusahaanPayload): Promise<Perusahaan> {
    const { data } = await api.post<Perusahaan>('/perusahaan', payload);
    return data;
  },

  // PUT /perusahaan/{id}
  async update(id: number, payload: PerusahaanPayload): Promise<Perusahaan> {
    const { data } = await api.put<Perusahaan>(`/perusahaan/${id}`, payload);
    return data;
  },

  // DELETE /perusahaan/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/perusahaan/${id}`);
  },
};