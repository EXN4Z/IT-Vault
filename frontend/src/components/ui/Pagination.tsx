import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number; // jumlah tombol di kiri dan kanan halaman aktif
  className?: string;
}

type Item = number | 'start-ellipsis' | 'end-ellipsis';

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

// susunan tombol: halaman pertama & terakhir selalu ada, "..." di antaranya.
// Jumlah tombolnya tetap, jadi barisnya tidak "lompat" saat pindah halaman.
function getItems(page: number, count: number, siblings: number): Item[] {
  const totalSlots = siblings * 2 + 5; // pertama, terakhir, aktif, 2 titik-titik, dan sibling
  if (count <= totalSlots) return range(1, count);

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, count);
  const showStartDots = left > 2;
  const showEndDots = right < count - 1;
  const edge = 3 + siblings * 2; // banyak tombol di ujung kalau salah satu "..." tidak tampil

  if (!showStartDots && showEndDots) return [...range(1, edge), 'end-ellipsis', count];
  if (showStartDots && !showEndDots) return [1, 'start-ellipsis', ...range(count - edge + 1, count)];
  return [1, 'start-ellipsis', ...range(left, right), 'end-ellipsis', count];
}

const pageBtn =
  'inline-flex h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent';
const navBtn =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40';

// =============================================================================
// PAGINATION: Sebelumnya | 1 2 3 ... 20 | Berikutnya, plus kolom "Ke halaman ..."
// - `page` dan `pageCount` dihitung dari 1
// - pindah halaman lewat klik, atau ketik nomor halaman lalu Enter / tombol Pergi
// =============================================================================
export default function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className = '',
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  const count = Math.max(1, Math.floor(pageCount) || 1);
  const current = Math.min(Math.max(1, page), count);
  const items = getItems(current, count, Math.max(0, siblingCount));

  const go = (target: number) => {
    const next = Math.min(Math.max(1, target), count); // nomor di luar batas dipaksa masuk 1..count
    if (next !== current) onPageChange(next);
  };

  const submitJump = () => {
    const n = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(n)) return;
    go(n);
    setJumpValue('');
  };

  return (
    <nav aria-label="Navigasi halaman" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={navBtn} disabled={current <= 1} onClick={() => go(current - 1)}>
          <ChevronLeft size={14} aria-hidden="true" />
          Sebelumnya
        </button>

        {items.map((item, i) =>
          typeof item === 'number' ? (
            <button
              key={i}
              type="button"
              aria-label={`Halaman ${item}`}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => go(item)}
              className={`${pageBtn} ${
                item === current ? 'bg-solid text-solid-ink' : 'text-ink-muted hover:bg-hover hover:text-ink'
              }`}
            >
              {item}
            </button>
          ) : (
            <span key={i} aria-hidden="true" className="inline-flex h-8 min-w-8 items-center justify-center text-xs text-ink-muted">
              …
            </span>
          ),
        )}

        <button type="button" className={navBtn} disabled={current >= count} onClick={() => go(current + 1)}>
          Berikutnya
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <span className="whitespace-nowrap tabular-nums">
          Halaman <span className="font-semibold text-ink">{current}</span> dari {count}
        </span>

        {count > 1 && (
          <>
            <span aria-hidden="true" className="h-4 w-px bg-line" />
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">Ke halaman</span>
              <input
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))} // hanya angka
                onKeyDown={(e) => { if (e.key === 'Enter') submitJump(); }}
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(count).length}
                placeholder={String(current)}
                aria-label="Ke halaman nomor"
                className="h-8 w-14 rounded-md border border-line bg-field px-2 text-center text-xs tabular-nums text-ink outline-none transition focus:border-accent placeholder:text-ink-muted/60"
              />
            </label>
            <button
              type="button"
              onClick={submitJump}
              disabled={jumpValue === ''}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-solid px-3 text-xs font-semibold text-solid-ink outline-none transition hover:bg-solid-hover focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pergi
            </button>
          </>
        )}
      </div>
    </nav>
  );
}