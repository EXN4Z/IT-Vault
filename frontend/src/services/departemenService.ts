import { api } from '../lib/api';
import type { Departemen, DepartemenPayload } from '../types/departemen';
import type { Paginated } from '../types/user';

export const departemenService = {
  // GET /departemen?search=...
  async list(page: number, perPage: number, search?: string): Promise<Paginated<Departemen>> {
    const { data } = await api.get<Paginated<Departemen>>('/departemen', {
      params: { page, per_page: perPage, search: search || undefined },
    });
    return data;
  },

  // POST /departemen
  async create(payload: DepartemenPayload): Promise<Departemen> {
    const { data } = await api.post<Departemen>('/departemen', payload);
    return data;
  },

  // PUT /departemen/{id}
  async update(id: number, payload: DepartemenPayload): Promise<Departemen> {
    const { data } = await api.put<Departemen>(`/departemen/${id}`, payload);
    return data;
  },

  // DELETE /departemen/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/departemen/${id}`);
  },
};