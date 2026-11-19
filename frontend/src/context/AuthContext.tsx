import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { tokenStorage } from '../lib/api';
import { authService } from '../services/authService';
import type { LoginPayload, User } from '../types/auth';

// ===== bentuk data yang dibagikan ke seluruh aplikasi =====
interface AuthContextValue {
  user: User | null;
  loading: boolean; // true selama pengecekan sesi awal (GET /me)
  isAdmin: boolean; // role admin; selain itu (user / tanpa role) hanya melihat dashboard user
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // kalau ada token tersimpan, kita perlu cek dulu ke server sebelum menentukan status login
  const [loading, setLoading] = useState(() => tokenStorage.get() !== null);

  // ===== cek sesi saat aplikasi pertama dibuka =====
  useEffect(() => {
    if (!tokenStorage.get()) return;

    authService
      .me()
      .then(setUser)
      .catch((error: unknown) => {
        // hapus token hanya kalau server menolak (401), bukan karena jaringan bermasalah
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          tokenStorage.clear();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ===== login: simpan token lalu set user =====
  const login = useCallback(async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    tokenStorage.set(data.token);
    setUser(data.user);
  }, []);

  // ===== logout: hapus token di server dan di browser =====
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* token di server mungkin sudah tidak valid, tetap logout di sisi klien */
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  const isAdmin = user?.role?.nama === 'admin';

  const value = useMemo(
    () => ({ user, loading, isAdmin, login, logout }),
    [user, loading, isAdmin, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// hook untuk membaca state login dari komponen mana pun
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return context;
}