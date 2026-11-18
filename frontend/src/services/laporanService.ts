import { api } from '../lib/api';
import type { JenisFotoLaporan, LaporanFotoItem } from '../types/laporan';

export async function getLaporanFotoInventory(params?: {
  jenis?: JenisFotoLaporan;
  search?: string;
}): Promise<LaporanFotoItem[]> {
  const { data } = await api.get<LaporanFotoItem[]>('/laporan/foto-inventory', { params });
  return data;
}