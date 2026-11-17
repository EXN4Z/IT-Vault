export interface UserRow {
  id: number;
  nik: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  tanggal_masuk: string | null; // dari server berbentuk ISO, ambil 10 karakter pertama untuk <input type="date">
  role_id: number | null;
  cabang_id: number | null;
  departemen_id: number | null;
  perusahaan_id: number | null;
  role: { id: number; nama: string } | null;
}

// data yang dikirim saat tambah / ubah (password dikirim hanya kalau diisi)
export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  phone: string | null;
  nik: string | null;
  tanggal_masuk: string | null;
  role_id: number | null;
  cabang_id: number | null;
  departemen_id: number | null;
  perusahaan_id: number | null;
  status: string;
}

// parameter export; nama field sama dengan yang dibaca UserExportRequest di backend
export interface UserExportParams {
  format: 'xlsx' | 'csv';
  scope: 'all' | 'filtered' | 'page';
  columns: string[];
  role?: string; // tab aktif, untuk scope filtered dan page
  search?: string;
  page?: number; // hanya untuk scope page
  per_page?: number;
}

// satu pilihan dropdown
export interface Option {
  id: number;
  nama: string;
}

// isi semua dropdown di form user
export interface UserOptions {
  roles: Option[];
  perusahaan: Option[];
  cabang: Option[];
  departemen: Option[];
}

// bentuk respons paginate() Laravel
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}