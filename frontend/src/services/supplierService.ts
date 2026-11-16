import { api } from '../lib/api';
import type { Supplier, SupplierPayload } from '../types/supplier';
import type { Paginated } from '../types/user';

export const supplierService = {
  // GET /supplier?search=...
  async list(page: number, perPage: number, search?: string): Promise<Paginated<Supplier>> {
    const { data } = await api.get<Paginated<Supplier>>('/supplier', {
      params: { page, per_page: perPage, search: search || undefined },
    });
    return data;
  },

  // POST /supplier
  async create(payload: SupplierPayload): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/supplier', payload);
    return data;
  },

  // PUT /supplier/{id}
  async update(id: number, payload: SupplierPayload): Promise<Supplier> {
    const { data } = await api.put<Supplier>(`/supplier/${id}`, payload);
    return data;
  },

  // DELETE /supplier/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/supplier/${id}`);
  },
};