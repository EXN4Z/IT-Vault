import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import FormField, { inputClass } from '../../../components/form/FormField';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { kategoriService } from '../../../services/kategoriService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import type { Kategori } from '../../../types/kategori';

interface KategoriFormModalProps {
  open: boolean;
  kategori: Kategori | null; // null = tambah baru, ada isi = ubah
  onClose: () => void;
  onSaved: () => void;
}

// form tambah / ubah kategori, dibungkus Modal
export default function KategoriFormModal({ open, kategori, onClose, onSaved }: KategoriFormModalProps) {
  const formId = useId();
  const [nama, setNama] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: isi ulang form (kosong untuk tambah, data lama untuk ubah)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setNama(kategori?.nama ?? '');
      setErrors({});
      setError('');
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNama(e.target.value);
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrors({ nama: 'Nama kategori wajib diisi.' });
      return;
    }

    setSaving(true);
    setErrors({});
    setError('');

    const payload = { nama: nama.trim() };

    try {
      if (kategori) await kategoriService.update(kategori.id, payload);
      else await kategoriService.create(payload);
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
      title={kategori ? 'Ubah kategori' : 'Tambah kategori'}
      description="Data kategori untuk master data."
      size="sm"
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
      <form id={formId} onSubmit={submit} className="space-y-3">
        {error && (
          <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>
        )}

        <FormField label="Nama kategori" required icon={Tag} error={errors.nama}>
          <input value={nama} onChange={handleChange} placeholder="Nama kategori" className={inputClass} />
        </FormField>
      </form>
    </Modal>
  );
}