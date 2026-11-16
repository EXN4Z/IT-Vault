export interface Cabang {
  id: number;
  nama: string;
  alamat: string | null;
  link: string | null;
  telepon: string | null;
}

// data yang dikirim saat tambah / ubah
export type CabangPayload = Omit<Cabang, 'id'>;

// hasil POST /cabang/import
export interface CabangImportResult {
  imported: number;
}

// parameter export; nama field sama dengan yang dibaca CabangExportRequest di backend
export interface CabangExportParams {
  format: 'xlsx' | 'csv';
  scope: 'all' | 'filtered' | 'page';
  columns: string[];
  search?: string; // dipakai untuk scope filtered dan page
  page?: number; // hanya untuk scope page
  per_page?: number; // hanya untuk scope page
}