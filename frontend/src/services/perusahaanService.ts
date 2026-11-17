import { api } from '../lib/api';
import type { Perusahaan, PerusahaanPayload } from '../types/perusahaan';
import type { Paginated } from '../types/user';
import type { ExportFormat, ExportScope } from '../components/modal/ExportModal';

  export interface PerusahaanImportResponse {
    message: string;
    ditambahkan: number;
    dipulihkan: number;
    dilewati: number;
    jumlah_error: number;
    errors: string[];
  }

  export interface PerusahaanExportParams {
    format: ExportFormat;
    scope: ExportScope;
    columns: string[];
    search?: string; // dipakai kalau scope = 'filtered'
    ids?: number[]; // dipakai kalau scope = 'page' (id baris yang tampil)
  }

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

  async import(file: File): Promise<PerusahaanImportResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<PerusahaanImportResponse>('/perusahaan/import', formData, {
      timeout: 0, // file besar diproses per baris di server, jangan putus di tengah
    });
    return data;
  },

  async export(params: PerusahaanExportParams): Promise<Blob> {
    const { data } = await api.get<Blob>('/perusahaan/export', {
      params,
      responseType: 'blob',
      timeout: 0,
    });
    return data;
  },
};