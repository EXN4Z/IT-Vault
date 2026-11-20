import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, MessageSquare } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import { ComboBox, DatePicker, FormField, PhotoUploadField, textareaClass } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { peminjamanService } from '../../../services/peminjamanService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { openReceiptWindow, writeReceipt } from '../../../lib/receipt';
import type { InventoryRow } from '../../../types/inventory';
import type { KaryawanOption, SerahTerimaReceipt } from '../../../types/peminjaman';

const PHOTO_COUNT = 3;

interface InventoryHandoverModalProps {
  open: boolean;
  inventory: InventoryRow | null; // barang utama yang mau diserahkan
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu serah terima tersimpan (untuk memuat ulang tabel)
}

interface FormState {
  user_id: string;
  tanggal_penerimaan: string;
  catatan: string;
}

// tanggal hari ini 'YYYY-MM-DD' (pakai jam lokal, bukan toISOString yang bisa mundur sehari)
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = (): FormState => ({ user_id: '', tanggal_penerimaan: today(), catatan: '' });

// modal "Serahkan ke karyawan": pilih pemakai, tanggal, catatan, 3 foto bukti; setelah berhasil struk dibuka
export default function InventoryHandoverModal({ open, inventory, onClose, onSaved }: InventoryHandoverModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [karyawan, setKaryawan] = useState<KaryawanOption[] | null>(null);
  const [blockedReceipt, setBlockedReceipt] = useState<SerahTerimaReceipt | null>(null); // struk yang popup-nya diblokir browser
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(emptyForm());
      setFiles([]);
      setErrors({});
      setError('');
      setBlockedReceipt(null);
      setKaryawan(null); // dimuat ulang tiap dibuka
    }
  }

  // ambil daftar karyawan tiap modal dibuka
  useEffect(() => {
    if (!open || karyawan) return;
    let ignore = false;
    peminjamanService
      .karyawan()
      .then((res) => { if (!ignore) setKaryawan(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, karyawan]);

  const karyawanOptions = useMemo(
    () =>
      (karyawan ?? []).map((k) => ({
        value: String(k.id),
        label: k.nik ? `${k.name} (${k.nik})` : k.name,
        disabled: k.status === 'aktif' ? undefined : 'Nonaktif',
      })),
    [karyawan],
  );
  
  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventory || saving) return;

    // cek di browser dulu supaya pesannya langsung muncul
    const found: Record<string, string> = {};
    if (!form.user_id) found.user_id = 'Pilih karyawan pemakai dulu.';
    if (!form.tanggal_penerimaan) found.tanggal_penerimaan = 'Tanggal penerimaan wajib diisi.';
    if (files.length !== PHOTO_COUNT) found.foto = `Foto barang bukti pemakai harus tepat ${PHOTO_COUNT} foto.`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setError('');
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const data = new FormData();
      data.append('user_id', form.user_id);
      data.append('tanggal_penerimaan', form.tanggal_penerimaan);
      if (form.catatan.trim()) data.append('catatan', form.catatan.trim());
      files.forEach((f) => data.append('foto[]', f));

      const receipt = await peminjamanService.serahkan(inventory.id, data);
      onSaved();
      if (win) {
        writeReceipt(win, receipt);
        onClose();
      } else {
        setBlockedReceipt(receipt);
      }
    } catch (err) {
      win?.close();
      const fieldErrors = getFieldErrors(err);
      // error per foto (foto.0, foto.1, ...) dijadikan satu pesan di kotak foto
      const fotoKey = Object.keys(fieldErrors).find((k) => k.startsWith('foto.'));
      if (fotoKey && !fieldErrors.foto) fieldErrors.foto = fieldErrors[fotoKey];
      const { inventory: inventoryError, ...rest } = fieldErrors;
      if (inventoryError) setError(inventoryError);
      if (Object.keys(rest).length > 0) setErrors(rest);
      else if (!inventoryError) setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openBlockedReceipt = () => {
    if (!blockedReceipt) return;
    const win = openReceiptWindow();
    if (win) writeReceipt(win, blockedReceipt);
  };

  const subtitle = inventory ? `${inventory.kode_inventory}${inventory.nama ? ` - ${inventory.nama}` : ''}` : undefined;
  const kelengkapan = inventory?.children_count ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Serahkan ke karyawan"
      description={subtitle}
      footer={
        blockedReceipt ? (
          <>
            <button type="button" className={btnOutline} onClick={onClose}>Tutup</button>
            <button type="button" className={btnSolid} onClick={openBlockedReceipt}>Buka Struk</button>
          </>
        ) : (
          <>
            <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" form={formId} className={btnSolid} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Serahkan Unit
            </button>
          </>
        )
      }
    >
      {blockedReceipt ? (
        <p className="text-sm text-ink-soft">
          Serah terima <span className="font-semibold text-ink">{blockedReceipt.nomor_penerimaan}</span> sudah tersimpan,
          tapi jendela struk diblokir browser. Klik <span className="font-semibold text-ink">Buka Struk</span> untuk menampilkannya.
        </p>
      ) : (
        <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
          {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

          {kelengkapan > 0 && (
            <p className="rounded-lg bg-hover px-3 py-2 text-xs text-ink-soft">
              {kelengkapan} kelengkapan ikut diserahkan dan tercatat dipakai oleh karyawan yang sama.
            </p>
          )}

          <FormField label="Cari Karyawan Pemakai" required error={errors.user_id}>
            <ComboBox
              options={karyawanOptions}
              value={form.user_id}
              onChange={setField('user_id')}
              placeholder={karyawan ? 'Pilih karyawan' : 'Memuat karyawan…'}
              searchPlaceholder="Cari nama atau NIK..."
              emptyText="Karyawan tidak ditemukan."
              disabled={!karyawan}
            />
          </FormField>

          <FormField label="Tanggal Penerimaan" required icon={CalendarDays} error={errors.tanggal_penerimaan}>
            <DatePicker value={form.tanggal_penerimaan} onChange={setField('tanggal_penerimaan')} />
          </FormField>

          <FormField label="Catatan Serah Terima" icon={MessageSquare} error={errors.catatan}>
            <textarea
              value={form.catatan}
              onChange={(e) => setField('catatan')(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Contoh: kondisi barang, kelengkapan yang dibawa"
              className={textareaClass}
            />
          </FormField>

          <PhotoUploadField
            label="Foto Barang Bukti Pemakai"
            required
            max={PHOTO_COUNT}
            files={files}
            onChange={(next) => { setFiles(next); setErrors((prev) => ({ ...prev, foto: '' })); }}
            error={errors.foto}
            disabled={saving}
          />
        </form>
      )}
    </Modal>
  );
}