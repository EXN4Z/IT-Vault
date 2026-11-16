import { useId, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, MessageSquare, Wrench } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import { ComboBox, DatePicker, FormField, PhotoUploadField, textareaClass } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import type { InventoryRow } from '../../../types/inventory';
import { JENIS_KERUSAKAN, type Penanganan } from '../../../types/penanganan';

interface PenangananLaporModalProps {
  open: boolean;
  inventory: InventoryRow | null; // barang yang dilaporkan (terkunci, dibuka dari modal Detail)
  onClose: () => void;
  onSaved: (penanganan: Penanganan) => void; // dipanggil begitu laporan tersimpan (untuk memuat ulang tabel)
}

interface FormState {
  jenis_kerusakan: string;
  keluhan: string;
  tanggal_lapor: string;
}

// tanggal hari ini 'YYYY-MM-DD' (pakai jam lokal, bukan toISOString yang bisa mundur sehari)
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = (): FormState => ({ jenis_kerusakan: '', keluhan: '', tanggal_lapor: today() });

const JENIS_OPTIONS = JENIS_KERUSAKAN.map((j) => ({ value: j.key, label: j.label }));

// modal "Lapor Kerusakan": jenis, keluhan, tanggal, 1 foto wajib. Status inventory diubah server (jadi Menunggu Perbaikan)
export default function PenangananLaporModal({ open, inventory, onClose, onSaved }: PenangananLaporModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(emptyForm());
      setFiles([]);
      setErrors({});
      setError('');
    }
  }

  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventory || saving) return;

    // cek di browser dulu supaya pesannya langsung muncul
    const found: Record<string, string> = {};
    if (!form.jenis_kerusakan) found.jenis_kerusakan = 'Jenis kerusakan wajib dipilih.';
    if (!form.keluhan.trim()) found.keluhan = 'Keluhan wajib diisi.';
    if (!form.tanggal_lapor) found.tanggal_lapor = 'Tanggal lapor wajib diisi.';
    if (files.length !== 1) found.foto = 'Foto kerusakan wajib diisi (1 foto).';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      data.append('jenis_kerusakan', form.jenis_kerusakan);
      data.append('keluhan', form.keluhan.trim());
      data.append('tanggal_lapor', form.tanggal_lapor);
      data.append('foto', files[0]);
      const penanganan = await penangananService.lapor(inventory.id, data);
      onSaved(penanganan);
      onClose();
    } catch (err) {
      const { inventory: inventoryError, ...rest } = getFieldErrors(err);
      if (inventoryError) setError(inventoryError);
      if (Object.keys(rest).length > 0) setErrors(rest);
      else if (!inventoryError) setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const subtitle = inventory ? `${inventory.kode_inventory}${inventory.nama ? ` - ${inventory.nama}` : ''}` : undefined;

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Lapor kerusakan"
      description={subtitle}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" form={formId} className={btnSolid} disabled={saving || !inventory}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Kirim Laporan
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

        <FormField label="Jenis Kerusakan" required icon={Wrench} error={errors.jenis_kerusakan}>
          <ComboBox
            options={JENIS_OPTIONS}
            value={form.jenis_kerusakan}
            onChange={setField('jenis_kerusakan')}
            placeholder="Pilih jenis kerusakan"
            searchable={false}
          />
        </FormField>

        <FormField label="Tanggal Lapor" required icon={CalendarDays} error={errors.tanggal_lapor}>
          <DatePicker value={form.tanggal_lapor} onChange={setField('tanggal_lapor')} />
        </FormField>

        <FormField label="Keluhan" required icon={MessageSquare} error={errors.keluhan}>
          <textarea
            value={form.keluhan}
            onChange={(e) => setField('keluhan')(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Contoh: layar berkedip lalu mati sendiri"
            className={textareaClass}
          />
        </FormField>

        <PhotoUploadField
          label="Foto Kerusakan"
          required
          max={1}
          files={files}
          onChange={(next) => { setFiles(next); setErrors((prev) => ({ ...prev, foto: '' })); }}
          error={errors.foto}
          disabled={saving}
        />
      </form>
    </Modal>
  );
}