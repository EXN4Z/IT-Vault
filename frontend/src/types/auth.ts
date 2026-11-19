// ===== tipe data untuk fitur autentikasi =====

// data user, sama dengan kolom tabel `users` di backend
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number | null;
  role: { id: number; nama: string } | null; // dikirim backend di /login dan /me ('user' atau 'admin')
  cabang_id: number | null;
  nik: string | null;
  departemen_id: number | null;
  tanggal_masuk: string | null;
  perusahaan_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// body request POST /login
export interface LoginPayload {
  login: string; // email atau nama
  password: string;
}

// respons POST /login
export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

// respons GET /me
export interface MeResponse {
  user: User;
}

// bentuk error dari Laravel (401 / 422 / 429)
export interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
}