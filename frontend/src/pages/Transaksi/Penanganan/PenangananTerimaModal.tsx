import { useId, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, Maximize2, Wrench } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import ImageZoomModal from '../../../components/modal/ImageZoomModal';
import Badge from '../../../components/ui/Badge';
import { DatePicker, FormField } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { today, tglJam } from '../../../lib/waktu';
import { STATUS_PENANGANAN, type Penanganan } from '../../../types/penanganan';

interface PenangananTerimaModalProps {
  open: boolean;
  penanganan: Penanganan | null; // laporan yang mau diterima
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu laporan diterima (untuk memuat ulang tabel)
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-ink-muted';
const rowClass = 'flex items-start justify-between gap-4 border-t border-line py-2 text-xs';

// modal "Terima laporan": detail laporan (foto, keluhan, data barang, pelapor) + pilih tanggal diterima.
// Penerima (admin yang login) dan jamnya dicatat server; status barang otomatis jadi Sedang Diperbaiki
export default function PenangananTerimaModal({ open, penanganan, onClose, onSaved }: PenangananTerimaModalProps) {
  const formId = useId();
  const [tanggal, setTanggal] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTanggal(today());
      setErrors({});
      setError('');
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!penanganan || saving) return;

    if (!tanggal) {
      setErrors({ tanggal_diterima: 'Tanggal diterima wajib diisi.' });
      return;
    }

    setSaving(true);
    setError('');
    try {
      await penangananService.terima(penanganan.id, tanggal);
      onSaved();
      onClose();
    } catch (err) {
      const { penanganan: penangananError, ...rest } = getFieldErrors(err);
      if (penangananError) setError(penangananError);
      if (Object.keys(rest).length > 0) setErrors(rest);
      else if (!penangananError) setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const p = penanganan;
  const barang = p?.inventory;
  const status = p ? STATUS_PENANGANAN.find((s) => s.key === p.status) : undefined;

  // baris "Data Barang" (label, nilai)
  const dataBarang: [string, string][] = [
    ['Kode inventory', barang?.kode_inventory ?? '-'],
    ['Nama unit', barang?.nama ?? '-'],
    ['Merk & tipe', [barang?.merk, barang?.type].filter(Boolean).join(' · ') || '-'],
    ['Serial number', barang?.serial_number ?? '-'],
    ['Warna', barang?.warna ?? '-'],
    ['Status sebelum dilapor', p ? p.status_sebelum.replace(/_/g, ' ') : '-'],
  ];

  return (
    <>
      <Modal
        open={open}
        onClose={() => { if (!saving) onClose(); }}
        title="Terima laporan"
        eyebrow={p ? [barang?.kode_inventory, p.jenis_label].filter(Boolean).join(' · ') : undefined}
        titleExtra={p && <Badge dot={status?.dot ?? 'bg-ink-muted'}>{status?.label ?? p.status}</Badge>}
        size="lg"
        footer={
          <>
            <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" form={formId} className={btnSolid} disabled={saving || !p}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Terima untuk Diperbaiki
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
          {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

          {p && (
            <>
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
                  {dataBarang.map(([label, nilai]) => (
                    <div key={label} className={rowClass}>
                      <dt className="shrink-0 text-ink-soft">{label}</dt>
                      <dd className="min-w-0 break-words text-right font-semibold text-ink">{nilai}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* info laporan */}
              <section>
                <h3 className={`${sectionTitle} mb-1`}>Dilaporkan</h3>
                <dl>
                  <div className={rowClass}>
                    <dt className="shrink-0 text-ink-soft">Waktu</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-ink">{tglJam(p.tanggal_lapor, p.lapor_at)}</dd>
                  </div>
                  <div className={rowClass}>
                    <dt className="shrink-0 text-ink-soft">Pelapor</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-ink">{p.pelapor ?? '-'}</dd>
                  </div>
                </dl>
              </section>
            </>
          )}

          <FormField label="Tanggal Diterima" required icon={CalendarDays} error={errors.tanggal_diterima}>
            <DatePicker
              value={tanggal}
              onChange={(v) => { setTanggal(v); setErrors((prev) => ({ ...prev, tanggal_diterima: '' })); }}
            />
          </FormField>

          <p className="text-[11px] text-ink-muted">
            Penerima dicatat otomatis sesuai akun yang login. Setelah diterima, status barang menjadi Sedang Diperbaiki.
          </p>
        </form>
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