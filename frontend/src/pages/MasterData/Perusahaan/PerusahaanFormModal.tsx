import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Building2, Link2, Loader2, MapPin, Phone } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import FormField, { inputClass, textareaClass } from '../../../components/form/FormField';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { perusahaanService } from '../../../services/perusahaanService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import type { Perusahaan } from '../../../types/perusahaan';

interface PerusahaanFormModalProps {
  open: boolean;
  perusahaan: Perusahaan | null; // null = tambah baru, ada isi = ubah
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nama: string;
  alamat: string;
  link: string;
  telepon: string;
}

const EMPTY: FormState = { nama: '', alamat: '', link: '', telepon: '' };

const toForm = (p: Perusahaan | null): FormState =>
  p ? { nama: p.nama, alamat: p.alamat ?? '', link: p.link ?? '', telepon: p.telepon ?? '' } : EMPTY;

// form tambah / ubah perusahaan, dibungkus Modal
export default function PerusahaanFormModal({ open, perusahaan, onClose, onSaved }: PerusahaanFormModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: isi ulang form (kosong untuk tambah, data lama untuk ubah)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(toForm(perusahaan));
      setErrors({});
      setError('');
    }
  }

  const bind = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: '' }));
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      setErrors({ nama: 'Nama perusahaan wajib diisi.' });
      return;
    }

    setSaving(true);
    setErrors({});
    setError('');

    // kolom opsional yang dikosongkan dikirim sebagai null
    const payload = {
      nama: form.nama.trim(),
      alamat: form.alamat.trim() || null,
      link: form.link.trim() || null,
      telepon: form.telepon.trim() || null,
    };

    try {
      if (perusahaan) await perusahaanService.update(perusahaan.id, payload);
      else await perusahaanService.create(payload);
      onSaved();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title={perusahaan ? 'Ubah perusahaan' : 'Tambah perusahaan'}
      description="Data perusahaan untuk master data."
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" form={formId} className={btnSolid} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Simpan
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid grid-cols-2 gap-3">
        {error && (
          <p className="col-span-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>
        )}

        <FormField label="Nama perusahaan" required icon={Building2} error={errors.nama} className="col-span-2">
          <input {...bind('nama')} placeholder="Nama perusahaan" className={inputClass} />
        </FormField>

        <FormField label="Alamat" icon={MapPin} error={errors.alamat} className="col-span-2">
          <textarea {...bind('alamat')} rows={2} placeholder="Alamat lengkap" className={textareaClass} />
        </FormField>

        <FormField label="Link" icon={Link2} error={errors.link}>
          <input {...bind('link')} placeholder="Tautan lokasi atau website" className={inputClass} />
        </FormField>

        <FormField label="Telepon" icon={Phone} error={errors.telepon}>
          <input {...bind('telepon')} placeholder="Nomor telepon" className={inputClass} />
        </FormField>
      </form>
    </Modal>
  );
}