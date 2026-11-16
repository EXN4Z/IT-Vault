import { formatTanggal } from './receipt';

// 'YYYY-MM-DD' + ISO 8601 -> '1 Jul 2026, 14:05' (tanggal dari server, jam dalam zona waktu browser)
export function tglJam(tanggal: string | null, waktu: string | null): string {
  if (!tanggal) return '-';
  if (!waktu) return formatTanggal(tanggal);
  const jam = new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  return `${formatTanggal(tanggal)}, ${jam}`;
}

// 150000 / '150000.00' -> 'Rp 150.000', kosong -> '-'
export function rupiah(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '-';
  return `Rp ${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

// tanggal hari ini 'YYYY-MM-DD' (pakai jam lokal, bukan toISOString yang bisa mundur sehari)
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}