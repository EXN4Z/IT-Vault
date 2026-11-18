import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Eye,
  ImageOff,
  Images,
  Loader2,
  Package,
  User,
  ZoomIn,
} from 'lucide-react';
import SearchField from '../../../components/ui/SearchField';
import SegmentedTabs from '../../../components/ui/SegmentedTabs';
import ComboBox from '../../../components/form/ComboBox';
import { Pagination } from '../../../components/ui/DataTable';
import Modal from '../../../components/modal/Modal';
import ImageZoomModal from '../../../components/modal/ImageZoomModal';
import { getLaporanFotoInventory } from '../../../services/laporanService';
import type { JenisFotoLaporan, LaporanFotoItem } from '../../../types/laporan';

const FILTER_TABS = [
  { key: 'semua', label: 'Semua', icon: Images },
  { key: 'peminjaman', label: 'Peminjaman', icon: ArrowUpRight },
  { key: 'pengembalian', label: 'Pengembalian', icon: ArrowDownLeft },
  { key: 'rusak', label: 'Rusak', icon: AlertTriangle },
] as const;

const BADGE_STYLE: Record<LaporanFotoItem['jenis'], string> = {
  peminjaman: 'bg-blue-600 text-white border-blue-700',
  pengembalian: 'bg-emerald-600 text-white border-emerald-700',
  rusak: 'bg-red-600 text-white border-red-700',
};

const PER_PAGE_OPTIONS = [8, 12, 24, 48].map((opt) => ({
  value: String(opt),
  label: String(opt),
}));

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  compact?: boolean;
  onStatusChange?: (ok: boolean) => void;
}

// Menampilkan gambar, atau placeholder sesuai kondisi: "Tidak ada foto" vs "Foto gagal dimuat"
function SafeImage({ src, alt, className, loading, compact = false, onStatusChange }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    onStatusChange?.(Boolean(src));
  }, [src]);

  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center text-ink-muted">
        <span className="flex flex-col items-center gap-1.5 text-center text-xs font-medium">
          <ImageOff size={compact ? 18 : 28} />
          {!compact && <span>Tidak ada foto</span>}
        </span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center text-ink-muted">
        <span className="flex flex-col items-center gap-1.5 px-2 text-center text-xs font-medium">
          <ImageOff size={compact ? 18 : 28} />
          {!compact && <span>Foto gagal dimuat</span>}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={() => onStatusChange?.(true)}
      onError={() => {
        setFailed(true);
        onStatusChange?.(false);
      }}
    />
  );
}

export default function FotoInventoryPage() {
  const [items, setItems] = useState<LaporanFotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [jenis, setJenis] = useState<JenisFotoLaporan>('semua');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [selected, setSelected] = useState<LaporanFotoItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [activePhotoValid, setActivePhotoValid] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await getLaporanFotoInventory({ jenis, search });
        if (!cancelled) {
          setItems(res);
          setPage(1);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jenis, search]);

  const handleJenisChange = (key: JenisFotoLaporan) => {
    setJenis(key);
    setPage(1);
  };

  const handlePerPageChange = (nextPerPage: number) => {
    setPerPage(nextPerPage);
    setPage(1);
  };

  const openPreview = (item: LaporanFotoItem) => {
    setSelected(item);
    setActivePhotoIdx(0);
    setActivePhotoValid(Boolean(item.foto_urls?.[0]));
    setZoomOpen(false);
  };

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pageCount);
  const paginatedItems = items.slice((safePage - 1) * perPage, safePage * perPage);
  const activeTabLabel = FILTER_TABS.find((t) => t.key === jenis)?.label ?? 'Semua';
  const activeSrc = selected?.foto_urls?.[activePhotoIdx];

  return (
    <div className="space-y-4">
      {/* Header & Pencarian */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Laporan Foto Inventory</h1>
          <p className="text-xs text-ink-muted">
            Dokumentasi foto barang saat peminjaman, pengembalian, dan laporan kerusakan
          </p>
        </div>

        <div className="w-full sm:w-72">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari kode, nama barang, no. struk..."
          />
        </div>
      </div>

      {/* Tabs Filter Jenis */}
      <div className="border-b border-line">
        <SegmentedTabs
          size="sm"
          tabs={FILTER_TABS}
          value={jenis}
          onChange={handleJenisChange}
        />
      </div>

      {/* Counter Data */}
      <p className="text-[11px] text-ink-muted">
        Total {activeTabLabel}:{' '}
        {loading ? (
          <Loader2 size={12} className="inline animate-spin align-middle" />
        ) : (
          <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
        )}{' '}
        dokumentasi
      </p>

      {/* Container Galeri + Footer Pagination */}
      <section className="w-full rounded-2xl border border-line p-3.5 sm:p-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: perPage > 8 ? 8 : perPage }).map((_, idx) => (
              <div key={idx} className="h-64 animate-pulse rounded-xl border border-line bg-hover" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-16 text-center">
            <ImageOff size={32} className="mb-2 text-ink-muted" />
            <p className="text-sm font-medium text-ink">Belum ada dokumentasi foto</p>
            <p className="mt-1 text-xs text-ink-muted">
              Foto dari proses peminjaman dan laporan kerusakan akan otomatis tampil di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedItems.map((item) => {
              const urls = item.foto_urls ?? [];
              return (
                <div
                  key={item.id}
                  onClick={() => openPreview(item)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-line bg-canvas transition hover:border-ink/40"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-hover">
                    <SafeImage
                      src={urls[0]}
                      alt={item.inventory?.nama ?? item.referensi}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      className={`absolute left-2.5 top-2.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold shadow-sm ${BADGE_STYLE[item.jenis]}`}
                    >
                      {item.jenis_label}
                    </span>
                    {urls.length > 1 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
                        +{urls.length - 1} foto
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-ink shadow">
                        <Eye size={14} /> Lihat Detail
                      </span>
                    </div>
                  </div>

                  {/* Info Singkat */}
                  <div className="flex flex-1 flex-col justify-between space-y-2 p-3">
                    <div>
                      <p className="font-mono text-[11px] text-ink-muted">
                        {item.inventory?.kode_inventory ?? '-'} • {item.referensi}
                      </p>
                      <p className="line-clamp-1 text-sm font-semibold text-ink">
                        {item.inventory?.nama ?? 'Barang tidak ditemukan'}
                      </p>
                      {item.keterangan && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{item.keterangan}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-line pt-2 text-[11px] text-ink-muted">
                      <span className="flex items-center gap-1 truncate">
                        <User size={12} /> {item.pelaku}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Calendar size={12} /> {item.tanggal ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Bawah */}
        <footer className="mt-3 border-t border-line pt-3.5 sm:pt-4">
          <div className="flex w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2 sm:gap-3">
              <div className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-ink-muted">
                <span className="hidden sm:inline">Tampilkan</span>
                <div className="w-[58px] sm:w-[68px]">
                  <ComboBox
                    options={PER_PAGE_OPTIONS}
                    value={String(perPage)}
                    onChange={(val) => handlePerPageChange(Number(val))}
                    searchable={false}
                    compact
                    panelWidth={80}
                    disabled={loading}
                  />
                </div>
                <span className="hidden sm:inline">item</span>
              </div>

              <span aria-hidden="true" className="h-4 w-px shrink-0 bg-line" />

              <Pagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          </div>
        </footer>
      </section>

      {/* Modal Preview Foto Lengkap */}
      <Modal
        open={selected !== null}
        onClose={() => {
          setZoomOpen(false);
          setSelected(null);
        }}
        title={selected ? `${selected.jenis_label} — ${selected.referensi}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            {/* Gambar Utama */}
            <div
              onClick={() => {
                if (activePhotoValid) setZoomOpen(true);
              }}
              className={`group relative overflow-hidden rounded-xl border border-line bg-hover ${
                activePhotoValid ? 'cursor-zoom-in' : 'min-h-48'
              }`}
            >
              <div className="flex min-h-48 items-center justify-center">
                <SafeImage
                  src={activeSrc}
                  alt={`Foto ${activePhotoIdx + 1}`}
                  className="max-h-[60vh] w-full object-contain"
                  onStatusChange={setActivePhotoValid}
                />
              </div>
              {activePhotoValid && (
                <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-zinc-900/85 px-2.5 py-1 text-[11px] font-medium text-white opacity-90 shadow transition group-hover:opacity-100">
                  <ZoomIn size={13} /> Perbesar
                </span>
              )}
            </div>

            {/* Thumbnail Selector jika foto > 1 */}
            {(selected.foto_urls?.length ?? 0) > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selected.foto_urls.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-hover transition ${
                      activePhotoIdx === idx ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={url}
                      alt={`Thumb ${idx + 1}`}
                      className="h-full w-full object-cover"
                      compact
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Metadata Transaksi */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3 text-xs">
              <div>
                <p className="text-ink-muted">Inventory</p>
                <p className="mt-0.5 flex items-center gap-1 font-semibold text-ink">
                  <Package size={13} />
                  {selected.inventory
                    ? `${selected.inventory.kode_inventory} - ${selected.inventory.nama}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-ink-muted">Tanggal</p>
                <p className="mt-0.5 font-semibold text-ink">{selected.tanggal ?? '-'}</p>
              </div>
              <div>
                <p className="text-ink-muted">
                  {selected.jenis === 'rusak' ? 'Dilaporkan Oleh' : 'Peminjam'}
                </p>
                <p className="mt-0.5 font-semibold text-ink">{selected.pelaku}</p>
              </div>
              <div>
                <p className="text-ink-muted">Keterangan / Keluhan</p>
                <p className="mt-0.5 font-medium text-ink">{selected.keterangan || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox Zoom Foto */}
      <ImageZoomModal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        images={selected?.foto_urls}
        initialIndex={activePhotoIdx}
        alt={selected ? `${selected.jenis_label} — ${selected.referensi}` : 'Preview foto'}
      />
    </div>
  );
}