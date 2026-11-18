import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageZoomModalProps {
  open: boolean;
  onClose: () => void;
  /** URL gambar tunggal */
  src?: string | null;
  /** Opsional: daftar URL gambar jika lebih dari satu */
  images?: string[];
  initialIndex?: number;
  alt?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const STEP = 0.25;

export default function ImageZoomModal({
  open,
  onClose,
  src,
  images,
  initialIndex = 0,
  alt = 'Preview foto',
}: ImageZoomModalProps) {
  const list = images && images.length > 0 ? images : src ? [src] : [];
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset posisi & zoom setiap kali dibuka atau pindah gambar
  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, list.length - 1)));
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [open, initialIndex, src, list.length]);

  const clampScale = (val: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(val * 100) / 100));

  const zoomIn = () => setScale((s) => clampScale(s + STEP));

  const zoomOut = () => {
    setScale((s) => {
      const next = clampScale(s - STEP);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const goTo = (nextIdx: number) => {
    if (list.length <= 1) return;
    const wrapped = (nextIdx + list.length) % list.length;
    setIndex(wrapped);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Keyboard shortcuts (capture phase agar Esc hanya menutup zoom, bukan modal di bawahnya)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (e.key === 'ArrowLeft' && list.length > 1) {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === 'ArrowRight' && list.length > 1) {
        e.preventDefault();
        goTo(index + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, index, list.length, onClose]);

  if (!open || list.length === 0) return null;

  const currentSrc = list[index] ?? list[0];

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const controlBtn =
    'flex size-8 cursor-pointer items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onWheel={handleWheel}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 select-none backdrop-blur-[2px]"
    >
      {/* Toolbar Pojok Kanan Atas (sesuai desain referensi) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed right-4 top-4 z-20 flex items-center gap-2"
      >
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/90 px-2 py-1 text-white shadow-lg">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="Perkecil (-)"
            aria-label="Perkecil"
            className={controlBtn}
          >
            <ZoomOut size={15} />
          </button>

          <span className="min-w-[46px] text-center text-xs font-medium tabular-nums text-zinc-100">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="Perbesar (+)"
            aria-label="Perbesar"
            className={controlBtn}
          >
            <ZoomIn size={15} />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            disabled={scale === 1 && offset.x === 0 && offset.y === 0}
            title="Reset ukuran (0)"
            aria-label="Reset ukuran"
            className={controlBtn}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Tutup (Esc)"
          aria-label="Tutup"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/90 text-zinc-200 shadow-lg transition hover:bg-white/15 hover:text-white"
        >
          <X size={17} />
        </button>
      </div>

      {/* Navigasi Kiri/Kanan jika foto > 1 */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1);
            }}
            aria-label="Foto sebelumnya"
            className="fixed left-4 top-1/2 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/90 text-white shadow-lg transition hover:bg-white/15"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
            aria-label="Foto berikutnya"
            className="fixed right-4 top-1/2 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-900/90 text-white shadow-lg transition hover:bg-white/15"
          >
            <ChevronRight size={20} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-zinc-900/90 px-3 py-1 text-xs font-medium tabular-nums text-zinc-200 shadow-lg"
          >
            {index + 1} / {list.length}
          </div>
        </>
      )}

      {/* Gambar Utama */}
      <img
        src={currentSrc}
        alt={alt}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`max-h-[86vh] max-w-[92vw] object-contain shadow-2xl ${
          scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
      />
    </div>,
    document.body,
  );
}