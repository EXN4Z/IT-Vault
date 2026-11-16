// posisi panel yang melayang (fixed) di layar
export interface Position {
  top?: number; // panel dibuka ke bawah
  bottom?: number; // panel dibuka ke atas (hanya kalau ruang di bawah terlalu sempit)
  left: number;
  width: number;
  maxHeight: number; // tinggi maksimal panel = sisa ruang di sisi yang dipakai
}

const GAP = 4; // jarak panel ke tombol
const MARGIN = 8; // jarak minimal panel ke tepi layar
const MIN_SPACE = 160; // kalau sisa ruang di bawah kurang dari ini, pertimbangkan buka ke atas

// hitung posisi panel dari posisi tombol pemicunya
// _panelHeight: tidak dipakai lagi, dibiarkan supaya pemanggilnya tidak perlu diubah
// panelWidth  : lebar panel (kosong = sama dengan lebar tombol)
export function getPosition(trigger: HTMLElement, _panelHeight: number, panelWidth?: number): Position {
  const rect = trigger.getBoundingClientRect();
  const width = panelWidth ?? rect.width;
  const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN)); // jangan keluar layar

  const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
  const spaceAbove = rect.top - GAP - MARGIN;

  // default di bawah; baru ke atas kalau di bawah sempit DAN di atas lebih lega
  if (spaceBelow < MIN_SPACE && spaceAbove > spaceBelow) {
    return { bottom: window.innerHeight - rect.top + GAP, left, width, maxHeight: spaceAbove };
  }
  return { top: rect.bottom + GAP, left, width, maxHeight: spaceBelow };
}