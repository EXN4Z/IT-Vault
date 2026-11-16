import { useId, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import { DatePicker, FormField } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { today } from '../../../lib/waktu';
import type { Penanganan } from '../../../types/penanganan';

interface PenangananTerimaModalProps {
  open: boolean;
  penanganan: Penanganan | null; // laporan yang mau diterima
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu laporan diterima (untuk memuat ulang tabel)
}

// modal "Terima laporan": pilih tanggal diterima. Penerima (admin yang login) dan jamnya dicatat server;
// status barang otomatis jadi Sedang Diperbaiki
export default function PenangananTerimaModal({ open, penanganan, onClose, onSaved }: PenangananTerimaModalProps) {
  const formId = useId();
  const [tanggal, setTanggal] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

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

  const barang = penanganan?.inventory;
  const subtitle = barang ? `${barang.kode_inventory}${barang.nama ? ` - ${barang.nama}` : ''}` : undefined;

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Terima laporan"
      description={subtitle}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" form={formId} className={btnSolid} disabled={saving || !penanganan}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Terima untuk Diperbaiki
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

        {penanganan && (
          <div className="rounded-lg bg-hover px-3 py-2.5 text-xs text-ink-soft">
            <p><span className="font-semibold text-ink">{penanganan.jenis_label}</span>{penanganan.pelapor ? ` · dilaporkan ${penanganan.pelapor}` : ''}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{penanganan.keluhan}</p>
          </div>
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
  );
}