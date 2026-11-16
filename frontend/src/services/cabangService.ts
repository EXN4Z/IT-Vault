import axios from 'axios';
import { api } from '../lib/api';
import type { Cabang, CabangPayload, CabangExportParams, CabangImportResult } from '../types/cabang';
import type { Paginated } from '../types/user';

export const cabangService = {
  // GET /cabang?search=...
  async list(page: number, perPage: number, search?: string): Promise<Paginated<Cabang>> {
    const { data } = await api.get<Paginated<Cabang>>('/cabang', {
      params: { page, per_page: perPage, search: search || undefined },
    });
    return data;
  },

  // GET /cabang/export -> file xlsx / csv (Blob)
  async export(params: CabangExportParams): Promise<Blob> {
    try {
      // array `columns` otomatis dikirim axios sebagai columns[]=nama&columns[]=alamat
      const { data } = await api.get<Blob>('/cabang/export', { params, responseType: 'blob' });
      return data;
    } catch (err) {
      // dengan responseType blob, pesan error server juga datang sebagai Blob;
      // ubah balik ke JSON supaya getErrorMessage bisa membacanya
      if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          err.response.data = JSON.parse(await err.response.data.text());
        } catch {
          /* bukan JSON -> biarkan apa adanya */
        }
      }
      throw err;
    }
  },

  // POST /cabang/import -> kirim file sebagai multipart
  async import(file: File): Promise<CabangImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<CabangImportResult>('/cabang/import', form);
    return data;
  },

  // POST /cabang
  async create(payload: CabangPayload): Promise<Cabang> {
    const { data } = await api.post<Cabang>('/cabang', payload);
    return data;
  },

  // PUT /cabang/{id}
  async update(id: number, payload: CabangPayload): Promise<Cabang> {
    const { data } = await api.put<Cabang>(`/cabang/${id}`, payload);
    return data;
  },

  // DELETE /cabang/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/cabang/${id}`);
  },
};