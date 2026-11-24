import type { PengembalianReceipt, SerahTerimaReceipt, StrukInventory } from '../types/peminjaman';
import { HASIL_PENANGANAN, type Penanganan } from '../types/penanganan';
import { formatDurasi, formatTanggal, rupiah, tglJam } from './waktu';

// formatTanggal sekarang ada di waktu.ts; diekspor ulang di sini supaya impor lama dari receipt tetap jalan
export { formatTanggal };

// cegah teks dari database ikut dibaca sebagai HTML
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// "IT-26-00096 — Flash Disk Robot RF116 16 GB Black"
function inventoryLabel(i: StrukInventory): string {
  // nama sering sudah memuat merk / type / warna, jadi hanya tambahkan bagian yang belum ada (cegah teks dobel)
  const nama = i.nama ?? '';
  const extra = [i.merk, i.type, i.warna].filter((v): v is string => !!v && !nama.toLowerCase().includes(v.toLowerCase()));
  const detail = [nama, ...extra].filter(Boolean).join(' ');
  return detail ? `${i.kode_inventory} — ${detail}` : i.kode_inventory;
}

// 'YYYY-MM-DD' dari sebuah waktu (jam lokal browser)
function tglLokal(waktu: string): string {
  const d = new Date(waktu);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// lama dipakai, semua satuan ditulis lengkap: '2 hari 3 jam 5 menit 10 detik'
// jam dipakai hanya kalau memang jam kejadian (tanggal bisa diisi mundur); kalau tidak, hitung selisih hari kalender
function lamaDipakai(r: PengembalianReceipt): string {
  const { waktu_penerimaan: a, waktu_pengembalian: b } = r;
  if (a && b && tglLokal(a) === r.tanggal_penerimaan && tglLokal(b) === r.tanggal_pengembalian) {
    const total = Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 1000));
    const bagian = [
      [Math.floor(total / 86_400), 'hari'],
      [Math.floor((total % 86_400) / 3_600), 'jam'],
      [Math.floor((total % 3_600) / 60), 'menit'],
      [total % 60, 'detik'],
    ].filter(([n]) => n !== 0).map(([n, u]) => `${n} ${u}`);
    return bagian.length ? bagian.join(' ') : '0 detik';
  }
  const hari = Math.round((new Date(r.tanggal_pengembalian).getTime() - new Date(r.tanggal_penerimaan).getTime()) / 86_400_000);
  return hari >= 1 ? `${hari} hari` : 'kurang dari 1 hari';
}

const row = (label: string, value: string) =>
  `<div class="row"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></div>`;

// baris barang: label (kalau ada) di atas, nama barang di bawahnya dalam satu baris penuh
const itemRow = (label: string, value: string) =>
  `<div class="item">${label ? `<div class="label">${esc(label)}</div>` : ''}<div class="ival">${esc(value)}</div></div>`;

// Jendela struk harus dibuka LANGSUNG saat tombol diklik (sebelum await), kalau tidak diblokir popup blocker.
// Panggil ini dulu, lalu isi lewat writeReceipt() / writePengembalianReceipt() setelah server membalas. null = popup diblokir.
export function openReceiptWindow(): Window | null {
  const win = window.open('', '_blank', 'width=520,height=720');
  if (win) {
    win.document.write('<title>Memproses…</title><body style="font-family:monospace;padding:24px;color:#555">Memproses…</body>');
  }
  return win;
}

// kerangka halaman struk (gaya sama untuk struk serah terima dan struk pengembalian)
function writePage(win: Window, o: { title: string; heading: string; nomor: string; tanggal: string; rows: string }): void {
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${esc(o.heading)} - ${esc(o.nomor)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px 16px; background: #fff; color: #111; font-family: 'Courier New', Courier, monospace; }
  .card { width: 100%; max-width: 420px; margin: 0 auto; padding: 28px 22px 22px; border: 1px dashed #9db0c8; border-radius: 14px; }
  .center { text-align: center; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .title { margin-top: 10px; font-size: 13px; font-weight: 700; letter-spacing: .04em; }
  .nomor { margin-top: 14px; font-size: 12px; color: #5b7aa3; }
  .tanggal { margin-top: 12px; font-size: 11px; color: #8fa3c0; }
  .divider { margin: 16px 0 12px; border: 0; border-top: 1px dashed #b9c6d8; }
  .row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; font-size: 11px; line-height: 1.35; }
  .item { margin-bottom: 8px; font-size: 11px; line-height: 1.35; }
  .item .label { margin-bottom: 2px; }
  .ival { text-align: right; font-weight: 700; }
  .label { flex: none; color: #5b7aa3; }
  .value { text-align: right; font-weight: 700; }
  .foot { margin-top: 18px; font-size: 9.5px; color: #8fa3c0; }
  .print { display: block; margin: 20px auto 0; padding: 8px 18px; border: 1px solid #b9c6d8; border-radius: 8px; background: #fff; font: 12px 'Courier New', monospace; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="card">
    <div class="center">
      <div class="brand">Marimas IT Vault</div>
      <div class="title">${esc(o.heading)}</div>
      <div class="nomor">${esc(o.nomor)}</div>
      <div class="tanggal">${esc(o.tanggal)}</div>
    </div>
    <hr class="divider">
    ${o.rows}
    <div class="center foot">Dicetak otomatis oleh sistem Marimas IT Vault</div>
  </div>
  <button class="print" onclick="window.print()">Cetak</button>
</body>
</html>`);
  win.document.close();
}

// isi jendela dengan struk serah terima
export function writeReceipt(win: Window, r: SerahTerimaReceipt): void {
  const rows = [
    itemRow('Inventory', inventoryLabel(r.inventory)),
    ...r.kelengkapan.map((k, idx) => itemRow(idx === 0 ? 'Kelengkapan' : '', inventoryLabel(k))),
    row('Diserahkan Kepada', r.pemakai.name),
    row('Nomor Penerimaan', r.nomor_penerimaan),
    ...(r.catatan ? [row('Catatan', r.catatan)] : []),
  ].join('');

  writePage(win, {
    title: 'Bukti Serah Terima Inventory',
    heading: 'Bukti Serah Terima Inventory',
    nomor: r.nomor_penerimaan,
    tanggal: formatTanggal(r.tanggal_penerimaan),
    rows,
  });
}

// isi jendela dengan struk pengembalian (barang utama + kelengkapan)
export function writePengembalianReceipt(win: Window, r: PengembalianReceipt): void {
  const dengan = (i: StrukInventory) => inventoryLabel(i);

  const rows = [
    itemRow('Inventory', dengan(r.inventory)),
    ...r.kelengkapan.map((k, idx) => itemRow(idx === 0 ? 'Kelengkapan' : '', dengan(k))),
    row('Dikembalikan Oleh', r.pemakai.name),
    row('Nomor Penerimaan', r.nomor_penerimaan),
    row('Tgl Serah Terima', formatTanggal(r.tanggal_penerimaan)),
    row('Dipakai Selama', lamaDipakai(r)),
    ...(r.catatan_kembali ? [row('Catatan Kembali', r.catatan_kembali)] : []),
  ].join('');

  writePage(win, {
    title: 'Bukti Pengembalian Inventory',
    heading: 'Bukti Pengembalian Inventory',
    nomor: r.nomor_penerimaan,
    tanggal: formatTanggal(r.tanggal_pengembalian),
    rows,
  });
}

// isi jendela dengan struk penanganan (perbaikan selesai: berhasil diperbaiki maupun tidak bisa diperbaiki).
// Semua datanya sudah ada di baris Penanganan dari server, jadi cetak ulang tidak butuh request lagi.
export function writePenangananReceipt(win: Window, p: Penanganan): void {
  const hasil = HASIL_PENANGANAN.find((h) => h.key === p.hasil)?.label ?? '-';
  // kedua biaya kosong (rusak berat) -> total juga kosong, tampil '-' bukan Rp 0
  const total = p.harga_jasa === null && p.biaya_komponen === null ? null : Number(p.harga_jasa ?? 0) + Number(p.biaya_komponen ?? 0);
  const nomor = p.no_struk ?? '-';

  const rows = [
    itemRow('Inventory', p.inventory ? inventoryLabel(p.inventory) : '-'),
    row('Jenis Kerusakan', p.jenis_label),
    row('Keluhan', p.keluhan),
    row('Dilaporkan Oleh', p.pelapor ?? '-'),
    row('Waktu Lapor', tglJam(p.tanggal_lapor, p.lapor_at)),
    row('Diterima Oleh', p.penerima ?? '-'),
    ...(p.tanggal_diterima ? [row('Waktu Diterima', tglJam(p.tanggal_diterima, p.diterima_at))] : []),
    ...(p.tanggal_selesai ? [row('Waktu Selesai', tglJam(p.tanggal_selesai, p.selesai_at))] : []),
    ...(p.diterima_at && p.selesai_at ? [row('Durasi Pengerjaan', formatDurasi(p.diterima_at, p.selesai_at))] : []),
    row('Hasil', hasil),
    row('Harga Jasa', rupiah(p.harga_jasa)),
    row('Biaya Komponen', rupiah(p.biaya_komponen)),
    row('Total Biaya', rupiah(total)),
    ...(p.catatan ? [row('Catatan', p.catatan)] : []),
    row('No. Struk', nomor),
  ].join('');

  writePage(win, {
    title: 'Bukti Penanganan Inventory',
    heading: 'Bukti Penanganan Inventory',
    nomor,
    tanggal: tglJam(p.tanggal_selesai, p.selesai_at),
    rows,
  });
}