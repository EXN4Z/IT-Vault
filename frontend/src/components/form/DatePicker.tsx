import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ComboBox, { type ComboboxOption } from './ComboBox';
import { getPosition, type Position } from './floating';

interface DatePickerProps {
  value: string; // format 'YYYY-MM-DD' ('' = belum dipilih), sama dengan yang dikirim ke / dari Laravel
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean; // true: ada tombol "Hapus"
  minYear?: number; // batas bawah pilihan tahun (default: 60 tahun lalu)
  maxYear?: number; // batas atas pilihan tahun (default: tahun depan)
  disabled?: boolean;
}

const PANEL_WIDTH = 260;
const PANEL_HEIGHT = 310; // perkiraan tinggi panel (getPosition sekarang tidak memakainya, panel selalu di bawah)
const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const MONTH_OPTIONS: ComboboxOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' }),
}));

// ----- helper tanggal -----
// sengaja TIDAK pakai new Date('2026-11-14'): string seperti itu dibaca sebagai UTC dan bisa mundur sehari
const pad = (n: number) => String(n).padStart(2, '0');

// bulan 0-11 (seperti JavaScript) -> 'YYYY-MM-DD'
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// 'YYYY-MM-DD' -> { y, m (0-11), d }
function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? { y, m: m - 1, d } : null;
}

// 'YYYY-MM-DD' -> '14 November 2026'
function formatDisplay(s: string) {
  const p = parse(s);
  return p ? new Date(p.y, p.m, p.d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

const navBtn =
  'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition hover:bg-selected';
const footBtn =
  'cursor-pointer rounded-md px-2 py-0.5 text-xs font-semibold text-ink-soft transition hover:bg-selected hover:text-ink';

// =============================================================================
// DATE PICKER: pilih tanggal lewat kalender (pengganti <input type="date">)
// - tombol di form menampilkan tanggal terpilih
// - klik tombol -> panel kalender, bulan dan tahun dipilih lewat ComboBox
// - nilainya string 'YYYY-MM-DD', jadi cocok langsung dengan kolom `tanggal_masuk`
// =============================================================================
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  clearable = false,
  minYear,
  maxYear,
  disabled = false,
}: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [viewYear, setViewYear] = useState(0); // bulan & tahun yang sedang dilihat di kalender
  const [viewMonth, setViewMonth] = useState(0); // (belum tentu sama dengan tanggal terpilih)

  const now = new Date();
  const todayStr = toStr(now.getFullYear(), now.getMonth(), now.getDate());

  // pilihan tahun: minYear..maxYear, tahun terbaru di atas. Tahun yang sedang dilihat selalu ikut masuk.
  const lowYear = Math.min(minYear ?? now.getFullYear() - 60, viewYear || now.getFullYear());
  const highYear = Math.max(maxYear ?? now.getFullYear() + 1, viewYear || now.getFullYear());
  const yearOptions = useMemo<ComboboxOption[]>(
    () => Array.from({ length: highYear - lowYear + 1 }, (_, i) => String(highYear - i)).map((y) => ({ value: y, label: y })),
    [lowYear, highYear],
  );

  const openPanel = () => {
    if (disabled || !triggerRef.current) return;
    const base = parse(value) ?? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
    setViewYear(base.y); // buka di bulan tanggal terpilih (atau bulan ini)
    setViewMonth(base.m);
    setPosition(getPosition(triggerRef.current, PANEL_HEIGHT, PANEL_WIDTH));
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus(); // fokus balik ke tombol
  };

  const pick = (next: string) => {
    onChange(next);
    closePanel();
  };

  // geser bulan; kalau lewat Desember / Januari, tahunnya ikut berganti
  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // selama panel terbuka: klik di luar menutup, scroll / resize memindahkan panel mengikuti tombol
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      // dropdown bulan / tahun (ComboBox) dirender di luar panel ini lewat portal,
      // klik di sana tidak boleh dianggap "klik di luar"
      if (target instanceof Element && target.closest('[data-floating-panel]')) return;
      setOpen(false);
    };
    const reposition = () => {
      if (triggerRef.current) setPosition(getPosition(triggerRef.current, PANEL_HEIGHT, PANEL_WIDTH));
    };

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  // pindahkan fokus ke panel supaya tombol Esc bisa ditangkap
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const onEscape = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // supaya Esc hanya menutup kalender, bukan seluruh Modal
      closePanel();
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (open) {
      onEscape(e);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPanel();
    }
  };

  // 42 sel (6 minggu x 7 hari), mulai dari hari Senin sebelum / pada tanggal 1
  // new Date(tahun, bulan, 0 atau negatif) otomatis mundur ke bulan sebelumnya
  const offset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Senin = 0
  const cells = Array.from({ length: 42 }, (_, i) => new Date(viewYear, viewMonth, 1 - offset + i));

  const label = formatDisplay(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button" // wajib: tanpa ini tombol di dalam <form> ikut men-submit form
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line bg-field px-3 text-left text-xs outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate ${label ? '' : 'text-ink-muted'}`}>{label || placeholder}</span>
        <ChevronDown size={14} className="shrink-0 text-ink-muted" />
      </button>

      {open && position &&
        createPortal(
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Pilih tanggal"
            onKeyDown={onEscape}
            style={position}
            className="fixed z-[60] animate-fade-in overflow-y-auto rounded-lg border border-ink-muted/30 bg-popover p-3 shadow-xl outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* kepala: panah bulan, dropdown bulan, dropdown tahun */}
            <div className="mb-2 flex items-center gap-1">
              <button type="button" aria-label="Bulan sebelumnya" className={navBtn} onClick={() => shiftMonth(-1)}>
                <ChevronLeft size={14} />
              </button>
              <div className="min-w-0 flex-1">
                <ComboBox
                  compact
                  searchable={false}
                  options={MONTH_OPTIONS}
                  value={String(viewMonth)}
                  onChange={(v) => setViewMonth(Number(v))}
                />
              </div>
              <div className="w-[68px] shrink-0">
                <ComboBox
                  compact
                  searchable={false}
                  options={yearOptions}
                  value={String(viewYear)}
                  onChange={(v) => setViewYear(Number(v))}
                />
              </div>
              <button type="button" aria-label="Bulan berikutnya" className={navBtn} onClick={() => shiftMonth(1)}>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* nama hari */}
            <div className="grid grid-cols-7 text-center text-[11px] text-ink-muted">
              {DAY_NAMES.map((d) => <span key={d} className="py-0.5">{d}</span>)}
            </div>

            {/* tanggal */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((c) => {
                const str = toStr(c.getFullYear(), c.getMonth(), c.getDate());
                const inMonth = c.getMonth() === viewMonth;
                const isSelected = str === value;
                const isToday = str === todayStr;

                return (
                  <button
                    key={str}
                    type="button"
                    onClick={() => pick(str)}
                    className={`mx-auto h-7 w-7 cursor-pointer rounded-lg text-xs transition ${
                      isSelected
                        ? 'bg-solid font-semibold text-solid-ink'
                        : `hover:bg-selected ${inMonth ? '' : 'text-ink-muted/50'} ${isToday ? 'font-semibold text-accent' : ''}`
                    }`}
                  >
                    {c.getDate()}
                  </button>
                );
              })}
            </div>

            {/* kaki */}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-1.5">
              <button type="button" className={footBtn} onClick={() => pick(todayStr)}>Hari ini</button>
              {clearable && value && (
                <button type="button" className={footBtn} onClick={() => pick('')}>Hapus</button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}