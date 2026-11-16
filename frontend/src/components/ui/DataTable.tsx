import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Pagination from './Pagination';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** lebar kolom di grid, misal '84px' atau 'minmax(0,1fr)' (default) */
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TablePagination {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
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
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const ALIGN = {
  left: 'justify-start text-left',
  center: 'justify-center text-center',
  right: 'justify-end text-right',
} as const;

// =============================================================================
// DATA TABLE: kotak tabel + pagination, reusable
// Halaman cukup menyerahkan `columns`, `data`, dan `pagination`.
// =============================================================================
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = 'Belum ada data.',
  minWidth = 720,
  pagination,
}: DataTableProps<T>) {
  const boxRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pageKey = pagination?.page;
  const prevPage = useRef(pageKey);
  const [siblingCount, setSiblingCount] = useState(2);

  // jumlah tombol halaman menyesuaikan lebar kotak
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = (w: number) => setSiblingCount(w < 480 ? 0 : w < 640 ? 1 : 2);
    apply(el.clientWidth);
    const observer = new ResizeObserver((entries) => entries.forEach((e) => apply(e.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // baris bergeser sedikit ke arah halaman baru
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

  return (
    <section ref={boxRef} className="w-full rounded-2xl border border-line p-3.5 sm:p-4">
      <div className="overflow-x-auto">
        <div className="overflow-x-clip" style={{ minWidth }}>
          <div
            className="grid h-9 items-center gap-3 rounded-lg bg-hover px-3 text-[11px] font-semibold text-ink-soft"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <span key={c.key} className={cell(c)}>{c.header}</span>
            ))}
          </div>

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

      {pagination && (
        <footer className="mt-3 border-t border-line pt-4">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            siblingCount={siblingCount}
            onPageChange={pagination.onPageChange}
          />
        </footer>
      )}
    </section>
  );
}