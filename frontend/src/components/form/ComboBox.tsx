import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { getPosition, type Position } from './floating';

// satu pilihan: `value` yang disimpan (misal id), `label` yang ditampilkan
export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string; // '' = belum ada pilihan
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearable?: boolean; // true: klik pilihan yang sedang aktif = kosongkan lagi
  searchable?: boolean; // false: tanpa kotak cari (cocok untuk pilihan yang cuma 2-5 biji)
  compact?: boolean; // true: tombol lebih pendek (untuk dipakai di dalam panel lain, misal DatePicker)
  panelWidth?: number; // lebar minimal panel dropdown (px); kalau kosong = selebar tombol
  disabled?: boolean;
}

const PANEL_HEIGHT = 300; // perkiraan tinggi panel (getPosition sekarang tidak memakainya, panel selalu di bawah)

// =============================================================================
// COMBOBOX: dropdown yang bisa dicari (pengganti <select> biasa)
// - tombol di form menampilkan pilihan sekarang
// - klik tombol -> panel berisi kotak cari + daftar pilihan
// - panel dirender lewat portal ke <body>, jadi tidak terpotong oleh area scroll Modal
// - keyboard: panah atas/bawah pindah, Enter pilih, Esc tutup panel (modal tidak ikut tertutup)
// =============================================================================
export default function ComboBox({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ditemukan.',
  clearable = false,
  searchable = true,
  compact = false,
  panelWidth,
  disabled = false,
}: ComboboxProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0); // baris yang sedang di-highlight

  const selected = options.find((o) => o.value === value);

  // daftar setelah difilter oleh kotak cari
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  // posisi panel: selebar tombol, atau selebar `panelWidth` kalau itu lebih besar
  const calcPosition = (trigger: HTMLElement) =>
    getPosition(trigger, PANEL_HEIGHT, Math.max(panelWidth ?? 0, trigger.getBoundingClientRect().width));

  const openPanel = () => {
    if (disabled || !triggerRef.current) return;
    setPosition(calcPosition(triggerRef.current));
    setSearch('');
    setActive(Math.max(options.findIndex((o) => o.value === value), 0)); // mulai dari pilihan sekarang
    setOpen(true);
    if (!searchable) triggerRef.current.focus(); // tidak ada kotak cari, keyboard ditangani tombolnya
  };

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus(); // fokus balik ke tombol
  };

  const pick = (next: string) => {
    onChange(clearable && next === value ? '' : next);
    closePanel();
  };

  // selama panel terbuka: klik di luar menutup, scroll / resize memindahkan panel mengikuti tombol
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reposition = () => {
      if (triggerRef.current) setPosition(calcPosition(triggerRef.current));
    };

    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true); // true: ikut menangkap scroll di dalam Modal
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panelWidth]);

  // baris yang di-highlight selalu terlihat saat digeser pakai keyboard
  useEffect(() => {
    if (open) itemRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const move = (dir: 1 | -1) =>
  setActive((i) => {
    let n = i + dir;
    while (n >= 0 && n < filtered.length && filtered[n].disabled) n += dir;
    return n >= 0 && n < filtered.length ? n : i;
  });

  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = filtered[active];
      if (option && !option.disabled) pick(option.value);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // supaya Esc hanya menutup dropdown, bukan seluruh Modal
      closePanel();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (open) {
      if (!searchable) handleKey(e); // tanpa kotak cari, fokus masih di tombol
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPanel();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button" // wajib: tanpa ini tombol di dalam <form> ikut men-submit form
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className={`flex ${compact ? 'h-8 gap-1 px-2' : 'h-10 gap-2 px-3'} w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-field text-left text-xs outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? '' : 'text-ink-muted'}`}>{selected?.label ?? placeholder}</span>
        <ChevronsUpDown size={compact ? 12 : 14} className="shrink-0 text-ink-muted" />
      </button>

      {open && position &&
        createPortal(
          <div
            ref={panelRef}
            data-floating-panel
            style={position}
            className="fixed z-[60] flex animate-fade-in flex-col overflow-hidden rounded-lg border border-ink-muted/30 bg-popover shadow-xl"
          >
            {searchable && (
              <label className="flex shrink-0 items-center gap-2 border-b border-line px-3">
                <Search size={14} className="shrink-0 text-ink-muted" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setActive(0); }}
                  onKeyDown={handleKey}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full bg-transparent text-xs outline-none placeholder:text-ink-muted"
                />
              </label>
            )}

            {/* scrollbar disembunyikan, daftar tetap bisa di-scroll pakai wheel / touchpad / keyboard */}
            <div
              id={listId}
              role="listbox"
              className="min-h-0 max-h-56 flex-1 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-ink-muted">{emptyText}</p>
              ) : (
                filtered.map((o, i) => (
                  <button
                    key={o.value}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    aria-disabled={!!o.disabled}
                    disabled={!!o.disabled}
                    onMouseEnter={() => { if (!o.disabled) setActive(i); }}
                    onClick={() => pick(o.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${
                      o.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${i === active && !o.disabled ? 'bg-selected' : ''}`}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.disabled ? (
                      <span className="shrink-0 text-[11px] text-ink-muted">{o.disabled}</span>
                    ) : (
                      o.value === value && <Check size={14} className="shrink-0 text-accent" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}