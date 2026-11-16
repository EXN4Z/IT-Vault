import axios from 'axios';

// ===== penyimpanan token (localStorage) =====
const TOKEN_KEY = 'token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null; // storage diblokir browser -> anggap belum login
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage diblokir -> abaikan */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage diblokir -> abaikan */
    }
  },
};

// ===== instance axios untuk semua request ke backend =====
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
});

// ===== interceptor request: tempel Bearer token otomatis =====
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});