import { api } from '../lib/api';
import type { Departemen, DepartemenPayload } from '../types/departemen';
import type { Paginated } from '../types/user';
import type { ExportFormat, ExportScope } from '../components/modal/ExportModal';

export interface DepartemenImportResponse {
  message: string;
  ditambahkan: number;
  dipulihkan: number;
  dilewati: number;
  jumlah_error: number;
  errors: string[];
}

export interface DepartemenExportParams {
  format: ExportFormat;
  scope: ExportScope;
  columns: string[];
  search?: string;   // dipakai kalau scope bukan 'all'
  page?: number;     // dipakai kalau scope = 'page'
  per_page?: number; // dipakai kalau scope = 'page'
}

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
  
  async import(file: File): Promise<DepartemenImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<DepartemenImportResponse>('/departemen/import', formData, {
      timeout: 0,
    });
    return data;
  },

    async export(params: DepartemenExportParams): Promise<Blob> {
      const { data } = await api.get<Blob>('/departemen/export', {
        params, // columns dikirim sebagai columns[]=nama
        responseType: 'blob',
        timeout: 0,
      });
      return data;
    },
};