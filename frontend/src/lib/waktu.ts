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

// Date -> 'YYYY-MM-DD' (pakai jam lokal, bukan toISOString yang bisa mundur sehari)
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// tanggal hari ini 'YYYY-MM-DD'
export function today(): string {
  return ymd(new Date());
}

// selisih hari kalender antara 'YYYY-MM-DD' dan hari ini (hanya tanggal, jamnya tidak ikut)
export function hariSejak(tanggal: string, now: Date = new Date()): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((hariIni.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
}

// 'YYYY-MM-DD' + ISO 8601 -> tanggal dengan jam, tapi jamnya dipakai hanya kalau memang jam di tanggal itu
// (tanggal serah terima bisa diisi mundur, jam pencatatannya lalu bukan jam kejadian)
export function tglJamSama(tanggal: string, waktu: string | null | undefined): string {
  if (!waktu || ymd(new Date(waktu)) !== tanggal) return formatTanggal(tanggal);
  return tglJam(tanggal, waktu);
}

// lama dari waktu ISO 8601 sampai sekarang, dua satuan terbesar tanpa detik:
// '2 hari 3 jam', '5 jam 12 menit', '8 menit', 'kurang dari 1 menit' (tidak pernah '0 hari')
export function formatLama(dari: string | Date, ke: string | Date = new Date()): string {
  const total = Math.max(0, Math.floor((new Date(ke).getTime() - new Date(dari).getTime()) / 60_000));
  const hari = Math.floor(total / 1_440);
  const jam = Math.floor((total % 1_440) / 60);
  const menit = total % 60;

  if (hari > 0) return jam > 0 ? `${hari} hari ${jam} jam` : `${hari} hari`;
  if (jam > 0) return menit > 0 ? `${jam} jam ${menit} menit` : `${jam} jam`;
  if (menit > 0) return `${menit} menit`;
  return 'kurang dari 1 menit';
}

// lama sejak sebuah tanggal yang jamnya belum tentu ada:
// - jam di tanggal itu ada -> durasi asli ('3 hari 4 jam', '5 jam 12 menit')
// - hanya tanggal -> '3 hari', atau 'hari ini' kalau barusan (bukan '0 hari')
export function lamaSejak(tanggal: string, waktu?: string | null, now: Date = new Date()): string {
  if (waktu && ymd(new Date(waktu)) === tanggal) return formatLama(waktu, now);
  const hari = hariSejak(tanggal, now);
  return hari >= 1 ? `${hari} hari` : 'hari ini';
}

// sama dengan lamaSejak, dengan akhiran 'lalu' ('3 hari lalu'; 'hari ini' tetap 'hari ini')
export function lamaLalu(tanggal: string, waktu?: string | null, now: Date = new Date()): string {
  const lama = lamaSejak(tanggal, waktu, now);
  return lama === 'hari ini' ? lama : `${lama} lalu`;
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