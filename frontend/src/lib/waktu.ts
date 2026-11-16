// 'YYYY-MM-DD' -> '1 Jul 2026'
export function formatTanggal(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

// selisih waktu asli antara dua waktu ISO 8601, dua satuan terbesar: '2 hari 3 jam', '5 jam 12 menit', '3 menit 20 detik', '45 detik'
export function formatDurasi(dari: string, ke: string): string {
  const total = Math.max(0, Math.floor((new Date(ke).getTime() - new Date(dari).getTime()) / 1000));
  const hari = Math.floor(total / 86_400);
  const jam = Math.floor((total % 86_400) / 3_600);
  const menit = Math.floor((total % 3_600) / 60);
  const detik = total % 60;

  if (hari > 0) return jam > 0 ? `${hari} hari ${jam} jam` : `${hari} hari`;
  if (jam > 0) return menit > 0 ? `${jam} jam ${menit} menit` : `${jam} jam`;
  if (menit > 0) return detik > 0 ? `${menit} menit ${detik} detik` : `${menit} menit`;
  return `${detik} detik`;
}