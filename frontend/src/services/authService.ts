import { api } from '../lib/api';
import type { LoginPayload, LoginResponse, MeResponse, User } from '../types/auth';

// semua pemanggilan endpoint autentikasi dikumpulkan di sini
export const authService = {
  // POST /login
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/login', payload);
    return data;
  },

  // POST /logout
  async logout(): Promise<void> {
    await api.post('/logout');
  },

  // GET /me -> data user yang sedang login
  async me(): Promise<User> {
    const { data } = await api.get<MeResponse>('/me');
    return data.user;
  },
};