// class tombol yang dipakai bersama (footer modal, header halaman, dst.)
const base =
  'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

export const btnSolid = `${base} bg-solid text-solid-ink hover:bg-solid-hover`;
export const btnOutline = `${base} border border-line bg-surface text-ink hover:bg-hover`;
export const btnDanger = `${base} bg-danger-bg text-danger hover:opacity-80`;