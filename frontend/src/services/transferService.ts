import axios from 'axios';
import { api } from '../lib/api';

// parameter export; nama field sama dengan yang nanti dibaca ExportRequest di backend
export interface ExportParams {
  format: 'xlsx' | 'csv';
  scope: 'all' | 'filtered' | 'page';
  columns: string[];
  search?: string; // untuk scope filtered dan page
  page?: number; // hanya untuk scope page
  per_page?: number;
}

export interface ImportResult {
  imported?: number;
  message?: string;
}

// export / import generik untuk halaman master data; `path` = '/perusahaan', '/departemen', dst
export const transferService = {
  // GET {path}/export -> file xlsx / csv (Blob); halaman boleh menambah parameter sendiri (mis. status)
  async export<T extends ExportParams>(path: string, params: T): Promise<Blob> {
    try {
      const { data } = await api.get<Blob>(`${path}/export`, { params, responseType: 'blob' });
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

  // POST {path}/import -> kirim file sebagai multipart
  async import(path: string, file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<ImportResult>(`${path}/import`, form);
    return data;
  },
};