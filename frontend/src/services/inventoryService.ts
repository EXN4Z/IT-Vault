import { api } from '../lib/api';
import type { InventoryKelengkapan, InventoryLinkCandidate, InventoryOptions, InventoryRow, InventoryPayload } from '../types/inventory';
import type { Paginated } from '../types/user';
import type { ExportOptions } from '../components/modal/ExportModal';

export interface InventoryImportResult {
  message: string;
  ditambahkan: number;
  dipulihkan: number;
  dilewati: number;
  jumlah_error: number;
  errors: string[];
}

// perubahan foto dari form: file baru (ganti / tambah) atau hapus foto lama
export interface InventoryFotoInput {
  file: File | null;
  hapus: boolean;
}

// form tambah / ubah dikirim multipart karena bisa membawa foto; null dikirim sebagai '' (server mengubahnya jadi null lagi)
function toFormData(payload: InventoryPayload, foto: InventoryFotoInput): FormData {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.append(key, value === null ? '' : String(value)));
  if (foto.file) form.append('foto', foto.file);
  else if (foto.hapus) form.append('hapus_foto', '1');
  return form;
}

export const inventoryService = {
  // GET /inventory?status=tersedia&search=...&sort_by=kode_inventory&sort_dir=asc
  async list(
    page: number,
    perPage: number,
    status?: string,
    search?: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
  ): Promise<Paginated<InventoryRow>> {
    const { data } = await api.get<Paginated<InventoryRow>>('/inventory', {
      params: {
        page,
        per_page: perPage,
        status,
        search: search || undefined, // undefined -> nggak ikut dikirim
        sort_by: sortBy || undefined,
        sort_dir: sortDir || undefined,
      },
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
  async create(payload: InventoryPayload, foto: InventoryFotoInput): Promise<InventoryRow> {
    const { data } = await api.post<InventoryRow>('/inventory', toFormData(payload, foto));
    return data;
  },

  // PUT /inventory/{id} (multipart tidak terbaca di PUT, jadi dikirim POST dengan _method=PUT)
  async update(id: number, payload: InventoryPayload, foto: InventoryFotoInput): Promise<InventoryRow> {
    const form = toFormData(payload, foto);
    form.append('_method', 'PUT');
    const { data } = await api.post<InventoryRow>(`/inventory/${id}`, form);
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

  async import(file: File): Promise<InventoryImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<InventoryImportResult>('/inventory/import', formData, {
      timeout: 0, // file besar diproses per baris di server, jangan putus di tengah
    });
    return data;
  },

  // POST /inventory/export -> file (blob)
  async export(
    opts: ExportOptions & { page: number; perPage: number; status?: string; search?: string },
  ): Promise<Blob> {
    const { data } = await api.post<Blob>(
      '/inventory/export',
      {
        format: opts.format,
        scope: opts.scope,
        columns: opts.columns,
        status: opts.status,
        search: opts.search || undefined,
        page: opts.page,
        per_page: opts.perPage,
      },
      { responseType: 'blob', timeout: 0 },
    );
    return data;
  },
};