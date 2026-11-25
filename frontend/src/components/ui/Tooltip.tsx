import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom';

interface TooltipProps {
  content?: ReactNode; // isi tooltip; kosongkan untuk memakai teks dari elemennya sendiri
  children: ReactNode; // elemen yang di-hover
  side?: Side; // sisi yang diutamakan (otomatis pindah kalau tidak muat)
  delay?: number; // jeda sebelum muncul (ms)
  onlyWhenTruncated?: boolean; // true = hanya muncul kalau teks terpotong "..."
  className?: string; // class untuk pembungkus (mis. "block truncate")
}

const GAP = 8; // jarak tooltip ke elemen
const MARGIN = 8; // jarak minimal tooltip ke tepi layar
const EXIT_MS = 120; // lama animasi keluar

interface Pos { left: number; top: number; side: Side; arrowLeft: number }

// true kalau elemen (atau isinya) benar-benar terpotong: "..." untuk 1 baris, atau line-clamp untuk banyak baris
function isTruncated(root: HTMLElement) {
  const clipped = (el: HTMLElement) => {
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1) return false;
    const { overflowX, overflowY } = getComputedStyle(el);
    return overflowX !== 'visible' || overflowY !== 'visible';
  };
  return clipped(root) || Array.from(root.querySelectorAll<HTMLElement>('*')).some(clipped);
}

export default function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
  onlyWhenTruncated = false,
  className = 'inline-flex',
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const exitTimer = useRef<number | undefined>(undefined);
  const id = useId();
  const [open, setOpen] = useState(false); // tooltip ada di DOM
  const [shown, setShown] = useState(false); // tooltip tampil penuh (memicu animasi)
  const [pos, setPos] = useState<Pos | null>(null);
  const [autoText, setAutoText] = useState(''); // teks dari elemen sendiri, dipakai kalau `content` kosong

  const show = () => {
    const el = triggerRef.current;
    if (!el) return;
    if (onlyWhenTruncated && !isTruncated(el)) return;
    if (content === undefined) {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      setAutoText(text);
    }
    window.clearTimeout(showTimer.current);
    window.clearTimeout(exitTimer.current); // kalau lagi animasi keluar, batalkan
    if (open) { setShown(true); return; }
    showTimer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = useCallback(() => {
    window.clearTimeout(showTimer.current);
    setShown(false); // jalankan animasi keluar dulu, baru dicopot dari DOM
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      setOpen(false);
      setPos(null);
    }, EXIT_MS);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(exitTimer.current);
  }, []);

  // hitung posisi setelah tooltip dirender (supaya ukurannya sudah diketahui)
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;
    const r = trigger.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;

    let s = side;
    if (s === 'top' && r.top - h - GAP < MARGIN) s = 'bottom';
    else if (s === 'bottom' && r.bottom + h + GAP > window.innerHeight - MARGIN) s = 'top';

    const center = r.left + r.width / 2;
    const left = Math.min(Math.max(center - w / 2, MARGIN), window.innerWidth - w - MARGIN);
    const top = s === 'top' ? r.top - h - GAP : r.bottom + GAP;
    const arrowLeft = Math.min(Math.max(center - left, 12), w - 12);
    setPos({ left, top, side: s, arrowLeft });

    // tunggu dua frame supaya keadaan awal (transparan) sempat tergambar, baru animasi masuk
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [open, side, content, autoText]);

  // tutup saat scroll, resize, atau tekan Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, hide]);

  const arrowSide = pos?.side ?? side;
  // geser sedikit dari arah tooltip berada, lalu meluncur ke posisi aslinya
  const hiddenShift = arrowSide === 'top' ? 'translateY(4px)' : 'translateY(-4px)';

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              visibility: pos ? 'visible' : 'hidden',
              opacity: shown ? 1 : 0,
              transform: shown ? 'none' : `${hiddenShift} scale(0.96)`,
              transformOrigin: `${pos?.arrowLeft ?? 0}px ${arrowSide === 'top' ? '100%' : '0'}`,
            }}
            className="pointer-events-none z-[100] max-w-[280px] break-words rounded-lg border border-line bg-popover px-2.5 py-1.5 text-xs text-ink shadow-md transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
          >
            {content ?? autoText}
            <span
              style={{ left: pos?.arrowLeft ?? 0 }}
              className={`absolute size-2 -translate-x-1/2 rotate-45 border-line bg-popover ${
                arrowSide === 'top' ? '-bottom-1 border-r border-b' : '-top-1 border-l border-t'
              }`}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
