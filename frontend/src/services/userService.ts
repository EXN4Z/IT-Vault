import axios from 'axios';
import { api } from '../lib/api';
import type { Paginated, UserExportParams, UserOptions, UserPayload, UserRow } from '../types/user';

export interface UserImportResult {
  message: string;
  ditambahkan: number;
  diperbarui: number;
  jumlah_error: number;
  errors: string[];
}

export const userService = {
  // GET /users?role=user|admin&search=...
  async list(page: number, perPage: number, role?: string, search?: string): Promise<Paginated<UserRow>> {
    const { data } = await api.get<Paginated<UserRow>>('/users', {
      params: { page, per_page: perPage, role, search: search || undefined }, // undefined -> nggak ikut dikirim
    });
    return data;
  },

  // GET /users/options (isi dropdown role, perusahaan, cabang, departemen)
  async options(): Promise<UserOptions> {
    const { data } = await api.get<UserOptions>('/users/options');
    return data;
  },

  // GET /users/export -> file xlsx / csv (Blob)
  async export(params: UserExportParams): Promise<Blob> {
    try {
      const { data } = await api.get<Blob>('/users/export', { params, responseType: 'blob' });
      return data;
    } catch (err) {
      // error server datang sebagai Blob; ubah balik ke JSON supaya getErrorMessage bisa membacanya
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

  // POST /users
  async create(payload: UserPayload): Promise<UserRow> {
    const { data } = await api.post<UserRow>('/users', payload);
    return data;
  },

  // PUT /users/{id}
  async update(id: number, payload: UserPayload): Promise<UserRow> {
    const { data } = await api.put<UserRow>(`/users/${id}`, payload);
    return data;
  },

  // DELETE /users/{id}
  async remove(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  // POST /users/import
  async import(file: File): Promise<UserImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<UserImportResult>('/users/import', formData, { timeout: 0 });
    return data;
  },
};