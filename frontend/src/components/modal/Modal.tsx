import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

// lama animasi buka/tutup (ms), harus sama dengan `duration-200` di bawah
const DURATION = 200;

const SIZES = {
  sm: 'max-w-[380px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[640px]',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string; // teks kecil di atas judul (misal kode + kategori)
  titleExtra?: ReactNode; // elemen di bawah judul (misal badge status)
  size?: keyof typeof SIZES;
  footer?: ReactNode; // biasanya tombol Batal + Simpan
  children: ReactNode;
}

// =============================================================================
// MODAL: cangkang generik (overlay, header, isi, footer + animasi buka/tutup)
// - klik area gelap TIDAK menutup modal; tutup lewat tombol X, tombol Batal, atau Esc
// - isi form ditaruh di `children`, tombol aksi di `footer`
// =============================================================================
export default function Modal({ open, onClose, title, description, eyebrow, titleExtra, size = 'md', footer, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose disimpan di ref supaya effect di bawah tidak jalan ulang tiap parent render
  // (kalau jalan ulang, fokus input yang sedang diketik bisa terlempar)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // mounted: modal ada di DOM (tetap true selama animasi tutup)
  // entered: frame pertama sudah dirender, jadi transisi masuk bisa jalan
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  if (open && !mounted) setMounted(true);
  const shown = open && entered;

  // animasi masuk: tunggu 2 frame supaya kondisi awal (transparan) sempat dirender
  useEffect(() => {
    if (!open) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setEntered(false);
    };
  }, [open]);

  // animasi keluar: lepas dari DOM setelah transisi tutup selesai
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), DURATION);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  // selama modal terbuka: kunci scroll halaman, Esc menutup, fokus masuk ke modal
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    // overlay: tidak ada onClick, jadi klik di luar modal tidak melakukan apa-apa
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink outline-none transition duration-200 ease-out motion-reduce:transition-none ${
          SIZES[size]
        } ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2.5 scale-[0.98] opacity-0'}`}
      >
        {/* header */}
        <div className={`flex gap-3 border-b border-line px-5 py-4 ${titleExtra ? 'items-start' : 'items-center'}`}>
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{eyebrow}</p>}
            <Tooltip className="block min-w-0" onlyWhenTruncated>
              <h2 id={titleId} className="truncate text-[15px] font-semibold">{title}</h2>
            </Tooltip>
            {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
            {titleExtra && <div className="mt-2">{titleExtra}</div>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-ink-muted transition hover:bg-hover hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* isi: scroll sendiri kalau kepanjangan */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>

        {/* footer (opsional) */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-hover px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}