import { useRef, useLayoutEffect, type ReactNode, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import ComboBox from '../form/ComboBox';

// =============================================================================
// 1. TIPE DATA & KONSTANTA
// =============================================================================
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** lebar kolom di grid, misal '84px' atau 'minmax(0,1fr)' (default) */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** aktifkan tombol panah urutkan (asc/desc) di header kolom ini */
  sortable?: boolean;
}

export interface TableSort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface TablePagination {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** opsional: isi jika ingin menampilkan dropdown batas baris (per page) */
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyText?: string;
  /** lebar minimum isi tabel sebelum bisa digeser horizontal */
  minWidth?: number;
  pagination?: TablePagination;
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DEFAULT_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ALIGN = {
  left: 'justify-start text-left',
  center: 'justify-center text-center',
  right: 'justify-end text-right',
} as const;

const pageBtn =
  'inline-flex h-7 min-w-7 sm:h-8 sm:min-w-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-1.5 sm:px-2 text-[11px] sm:text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent';
const navBtn =
  'inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40';

// Susunan ringkas: < 1 ... 10 > (atau < 1 ... 5 ... 10 > saat berada di halaman tengah)
function getCompactPageItems(current: number, count: number): PageItem[] {
  if (count <= 3) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }
  if (current === 1) return [1, 'end-ellipsis', count];
  if (current === 2) return [1, 2, 'end-ellipsis', count];
  if (current === count) return [1, 'start-ellipsis', count];
  if (current === count - 1) return [1, 'start-ellipsis', count - 1, count];
  return [1, 'start-ellipsis', current, 'end-ellipsis', count];
}

// =============================================================================
// 2. KOMPONEN PAGINATION RINGKAS: < 1 ... 10 > + kolom "Ke halaman ..."
// =============================================================================
export function Pagination({
  page,
  pageCount,
  onPageChange,
  className = '',
}: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  const count = Math.max(1, Math.floor(pageCount) || 1);
  const current = Math.min(Math.max(1, page), count);
  const items = getCompactPageItems(current, count);

  const go = (target: number) => {
    const next = Math.min(Math.max(1, target), count);
    if (next !== current) onPageChange(next);
  };

  const submitJump = () => {
    const n = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(n)) return;
    go(n);
    setJumpValue('');
  };

  return (
    <nav
      aria-label="Navigasi halaman"
      className={`flex shrink-0 flex-nowrap items-center gap-2 sm:gap-3 ${className}`}
    >
      {/* Tombol Halaman: < 1 ... 10 > */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
          className={navBtn}
          disabled={current <= 1}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft size={14} aria-hidden="true" />
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
            <span
              key={i}
              aria-hidden="true"
              className="inline-flex h-7 min-w-3.5 sm:h-8 sm:min-w-5 items-center justify-center text-[11px] sm:text-xs text-ink-muted"
            >
              …
            </span>
          ),
        )}

        <button
          type="button"
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
          className={navBtn}
          disabled={current >= count}
          onClick={() => go(current + 1)}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Input Loncat Halaman ("Ke halaman") */}
      {count > 1 && (
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-ink-muted">
          <label className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden whitespace-nowrap sm:inline">Ke halaman</span>
            <span className="whitespace-nowrap sm:hidden">Hal</span>
            <input
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') submitJump(); }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={String(count).length}
              placeholder={String(current)}
              aria-label="Ke halaman nomor"
              className="h-7 w-10 sm:h-8 sm:w-14 rounded-md border border-line bg-field px-1.5 sm:px-2 text-center text-[11px] sm:text-xs tabular-nums text-ink outline-none transition focus:border-accent placeholder:text-ink-muted/60"
            />
          </label>
          <button
            type="button"
            onClick={submitJump}
            disabled={jumpValue === ''}
            className="inline-flex h-7 sm:h-8 shrink-0 cursor-pointer items-center rounded-md bg-solid px-2 sm:px-3 text-[11px] sm:text-xs font-semibold text-solid-ink outline-none transition hover:bg-solid-hover focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pergi
          </button>
        </div>
      )}
    </nav>
  );
}

// =============================================================================
// 3. KOMPONEN UTAMA DATA TABLE (Tabel Utama + Sorting + Limit Baris + Pagination)
// =============================================================================
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = 'Belum ada data.',
  minWidth = 720,
  pagination,
  sort,
  onSortChange,
}: DataTableProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const pageKey = pagination?.page;
  const prevPage = useRef(pageKey);

  // Animasi geser halus tiap kali pindah halaman
  useLayoutEffect(() => {
    const from = prevPage.current;
    prevPage.current = pageKey;
    const list = listRef.current;
    if (
      from === pageKey || from === undefined || pageKey === undefined || !list ||
      typeof list.animate !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    const shift = pageKey > from ? 18 : -18;
    list.animate(
      [{ opacity: 0.15, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: 180, easing: EASE },
    );
  }, [pageKey]);

  const template = columns.map((c) => c.width ?? 'minmax(0,1fr)').join(' ');
  const cell = (c: Column<T>) => `flex min-w-0 items-center ${ALIGN[c.align ?? 'left']}`;
  const hasPerPage = pagination?.perPage !== undefined && pagination?.onPerPageChange !== undefined;

  const perPageOptions = (pagination?.perPageOptions ?? DEFAULT_PER_PAGE_OPTIONS).map((opt) => ({
    value: String(opt),
    label: String(opt),
  }));

  // 2 aksi saja: default klik pertama 'asc', klik berikutnya bolak-balik 'asc' <-> 'desc'
  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort?.key !== key) {
      onSortChange({ key, dir: 'asc' });
    } else {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    }
  };

  return (
    <section className="w-full rounded-2xl border border-line p-3.5 sm:p-4">
      
      {/* ==================== TABEL UTAMA (Header + Baris Data) ==================== */}
      <div className="overflow-x-auto">
        <div className="overflow-x-clip" style={{ minWidth }}>
          {/* Header Kolom Tabel */}
          <div
            className="grid h-9 items-center gap-3 rounded-lg bg-hover px-3 text-[11px] font-semibold text-ink-soft"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => {
              const activeDir = sort?.key === c.key ? sort.dir : null;

              if (c.sortable && onSortChange) {
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`${cell(c)} group cursor-pointer gap-1.5 rounded py-1 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      activeDir ? 'text-ink' : ''
                    }`}
                  >
                    <span>{c.header}</span>
                    {activeDir === 'desc' ? (
                      <ArrowDown size={13} className="shrink-0 text-accent" />
                    ) : activeDir === 'asc' ? (
                      <ArrowUp size={13} className="shrink-0 text-accent" />
                    ) : (
                      <ArrowUp size={13} className="shrink-0 opacity-30 transition-opacity group-hover:opacity-80" />
                    )}
                  </button>
                );
              }

              return (
                <span key={c.key} className={`${cell(c)} whitespace-nowrap`}>{c.header}</span>
              );
            })}
          </div>

          {/* Isi Baris Tabel (Loading / Kosong / Daftar Data) */}
          <div ref={listRef} className="divide-y divide-line/60">
            {loading ? (
              <p className="px-3 py-10 text-center text-xs text-ink-muted">Memuat data…</p>
            ) : data.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs text-ink-muted">{emptyText}</p>
            ) : (
              data.map((row) => (
                <div
                  key={rowKey(row)}
                  className="grid min-h-[44px] items-center gap-3 px-3 text-xs text-ink"
                  style={{ gridTemplateColumns: template }}
                >
                  {columns.map((c) => (
                    <div key={c.key} className={`${cell(c)} ${c.align ? '' : 'truncate'}`}>{c.cell(row)}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==================== FOOTER BAWAH (Rata Kanan & Aman di-Scroll di Mobile) ==================== */}
      {pagination && (
        <footer className="mt-3 border-t border-line pt-3.5 sm:pt-4">
          <div className="flex w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hasPerPage ? (
              <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2 sm:gap-3">
                
                {/* --- COMBOBOX PER PAGE --- */}
                <div className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-ink-muted">
                  <span className="hidden sm:inline">Tampilkan</span>
                  <div className="w-[58px] sm:w-[68px]">
                    <ComboBox
                      options={perPageOptions}
                      value={String(pagination.perPage)}
                      onChange={(val) => pagination.onPerPageChange!(Number(val))}
                      searchable={false}
                      compact
                      panelWidth={80}
                      disabled={loading}
                    />
                  </div>
                  <span className="hidden sm:inline">baris</span>
                </div>

                <span aria-hidden="true" className="h-4 w-px shrink-0 bg-line" />

                {/* --- PAGINATION (< 1 ... 10 > + Loncat Halaman) --- */}
                <Pagination
                  page={pagination.page}
                  pageCount={pagination.pageCount}
                  onPageChange={pagination.onPageChange}
                />
              </div>
            ) : (
              <Pagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                onPageChange={pagination.onPageChange}
                className="ml-auto"
              />
            )}
          </div>
        </footer>
      )}
    </section>
  );
}