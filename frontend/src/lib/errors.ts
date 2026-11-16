import axios from 'axios';
import type { ApiError } from '../types/auth';

// ubah error axios/Laravel jadi satu pesan yang siap ditampilkan ke user
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    // tidak ada respons -> server mati / jaringan putus
    if (!error.response) {
      return 'Tidak dapat terhubung ke server.';
    }

    // kena throttle (terlalu banyak percobaan login)
    if (error.response.status === 429) {
      return 'Terlalu banyak percobaan. Coba lagi sebentar.';
    }

    // utamakan error validasi per-field (422), lalu pesan umum dari server
    const data = error.response.data;
    const fieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
    return fieldError ?? data?.message ?? 'Terjadi kesalahan pada server.';
  }

  return 'Terjadi kesalahan tak terduga.';
}

// daftar pesan untuk satu field (422), dipakai untuk menampilkan banyak error sekaligus (misal per baris import)
export function getErrorList(error: unknown, field: string): string[] {
  if (!axios.isAxiosError<ApiError>(error) || error.response?.status !== 422) return [];
  return error.response.data?.errors?.[field] ?? [];
}

// error validasi per-field (422) -> { nama: 'Nama wajib diisi.', ... }, kosong kalau bukan 422
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiError>(error) || error.response?.status !== 422) return {};
  const errors = error.response.data?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]));
}