import { useState, type ReactNode } from 'react';
import { Maximize2, Printer, Wrench } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import ImageZoomModal from '../../../components/modal/ImageZoomModal';
import Badge from '../../../components/ui/Badge';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { openReceiptWindow, writePenangananReceipt } from '../../../lib/receipt';
import { formatDurasi, rupiah, tglJam } from '../../../lib/waktu';
import { HASIL_PENANGANAN, STATUS_PENANGANAN, type Penanganan } from '../../../types/penanganan';

interface PenangananDetailModalProps {
  open: boolean;
  penanganan: Penanganan | null;
  onClose: () => void;
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-ink-muted';

// satu baris label (kiri) + nilai (kanan), dengan garis di atasnya
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-2 text-xs">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

// satu tahap di garis waktu: titik terisi = sudah dilalui, kosong = belum
function Step({ title, done, tone = 'bg-accent', children }: { title: string; done: boolean; tone?: string; children?: ReactNode }) {
  return (
    <li className="relative pb-4 pl-5 last:pb-0">
      <span className={`absolute -left-[5px] top-1 size-2.5 rounded-full ${done ? tone : 'border border-line bg-surface'}`} />
      <p className={`text-xs font-semibold ${done ? 'text-ink' : 'text-ink-muted'}`}>{title}</p>
      {done ? <dl className="mt-1">{children}</dl> : <p className="mt-0.5 text-[11px] italic text-ink-muted">Belum</p>}
    </li>
  );
}

// modal "Detail penanganan": data barang, foto + keluhan, dan garis waktu lapor -> diterima -> selesai (atau dibatalkan)
export default function PenangananDetailModal({ open, penanganan: p, onClose }: PenangananDetailModalProps) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const status = p ? STATUS_PENANGANAN.find((s) => s.key === p.status) : undefined;
  const hasil = p ? HASIL_PENANGANAN.find((h) => h.key === p.hasil) : undefined;
  const dibatalkan = p?.status === 'dibatalkan';
  const diterima = !!p?.tanggal_diterima;
  const selesai = !!p?.tanggal_selesai;
  const totalBiaya = p && selesai && (p.harga_jasa !== null || p.biaya_komponen !== null) ? Number(p.harga_jasa ?? 0) + Number(p.biaya_komponen ?? 0) : null;
  const barang = p?.inventory;

  // cetak ulang struk (data sudah ada di sini); jendela harus dibuka langsung di klik
  const cetakStruk = () => {
    if (!p) return;
    const win = openReceiptWindow();
    if (win) writePenangananReceipt(win, p);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Detail penanganan"
        eyebrow={p ? [barang?.kode_inventory, p.jenis_label].filter(Boolean).join(' · ') : undefined}
        titleExtra={p && <Badge dot={status?.dot ?? 'bg-ink-muted'}>{status?.label ?? p.status}</Badge>}
        size="lg"
        footer={
          <>
            <button type="button" className={btnOutline} onClick={onClose}>Tutup</button>
            {p?.no_struk && (
              <button type="button" className={btnSolid} onClick={cetakStruk}>
                <Printer size={14} />Cetak struk
              </button>
            )}
          </>
        }
      >
        {p && (
          <div className="flex flex-col gap-5">
            {/* foto kerusakan + keluhan */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                title="Perbesar foto"
                className="group relative block h-36 w-48 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-line bg-field text-left"
              >
                <img
                  src={p.foto_url}
                  alt="Foto kerusakan"
                  className="size-full object-cover transition duration-200 group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
                  <Maximize2 size={10} />Perbesar
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <h3 className={`${sectionTitle} mb-1 flex items-center gap-1.5`}><Wrench size={12} />Keluhan</h3>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-hover px-3 py-2.5 text-xs text-ink">{p.keluhan}</p>
                <p className="mt-2 text-[11px] text-ink-muted">Jenis kerusakan: <span className="font-semibold text-ink-soft">{p.jenis_label}</span></p>
              </div>
            </div>

            {/* data barang */}
            <section>
              <h3 className={`${sectionTitle} mb-1`}>Data Barang</h3>
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <InfoRow label="Kode inventory">{barang?.kode_inventory ?? '-'}</InfoRow>
                <InfoRow label="Nama unit">{barang?.nama ?? '-'}</InfoRow>
                <InfoRow label="Merk & tipe">{[barang?.merk, barang?.type].filter(Boolean).join(' · ') || '-'}</InfoRow>
                <InfoRow label="Serial number">{barang?.serial_number ?? '-'}</InfoRow>
                <InfoRow label="Warna">{barang?.warna ?? '-'}</InfoRow>
                <InfoRow label="Status sebelum dilapor">{p.status_sebelum.replace(/_/g, ' ')}</InfoRow>
              </dl>
            </section>

            {/* garis waktu */}
            <section>
              <h3 className={`${sectionTitle} mb-3`}>Riwayat Penanganan</h3>
              <ol className="ml-1.5 border-l border-line">
                <Step title="Dilaporkan" done tone="bg-warn">
                  <InfoRow label="Waktu">{tglJam(p.tanggal_lapor, p.lapor_at)}</InfoRow>
                  <InfoRow label="Pelapor">{p.pelapor ?? '-'}</InfoRow>
                </Step>

                <Step title="Diterima untuk diperbaiki" done={diterima} tone="bg-accent">
                  <InfoRow label="Waktu">{tglJam(p.tanggal_diterima, p.diterima_at)}</InfoRow>
                  <InfoRow label="Diterima oleh">{p.penerima ?? '-'}</InfoRow>
                </Step>

                {dibatalkan ? (
                  <Step title="Dibatalkan" done tone="bg-ink-muted">
                    <InfoRow label="Alasan">{p.catatan ?? '-'}</InfoRow>
                  </Step>
                ) : (
                  <Step title="Selesai" done={selesai} tone={p.hasil === 'tidak_bisa_diperbaiki' ? 'bg-danger' : 'bg-success'}>
                    <InfoRow label="Waktu Pengerjaan">{`${tglJam(p.tanggal_diterima, p.diterima_at)} - ${tglJam(p.tanggal_selesai, p.selesai_at)}`}</InfoRow>
                    <InfoRow label="Durasi">{p.diterima_at && p.selesai_at ? formatDurasi(p.diterima_at, p.selesai_at) : '-'}</InfoRow>
                    <InfoRow label="Hasil">{hasil?.label ?? '-'}</InfoRow>
                    <InfoRow label="Harga jasa">{rupiah(p.harga_jasa)}</InfoRow>
                    <InfoRow label="Biaya komponen">{rupiah(p.biaya_komponen)}</InfoRow>
                    <InfoRow label="Total biaya">{rupiah(totalBiaya)}</InfoRow>
                    <InfoRow label="Catatan">{p.catatan ?? '-'}</InfoRow>
                    <InfoRow label="No. struk">{p.no_struk ?? '-'}</InfoRow>
                  </Step>
                )}
              </ol>
            </section>
          </div>
        )}
      </Modal>

      <ImageZoomModal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        src={p?.foto_url}
        alt={`Foto kerusakan ${barang?.nama ?? ''}`.trim()}
      />
    </>
  );
}