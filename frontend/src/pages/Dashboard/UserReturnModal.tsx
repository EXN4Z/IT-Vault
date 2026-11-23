import { useId, useState, type FormEvent } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Modal from '../../components/modal/Modal';
import { FormField, PhotoUploadField, textareaClass } from '../../components/form';
import { btnOutline, btnSolid } from '../../components/ui/buttonStyles';
import { myInventoryService } from '../../services/myInventoryService';
import { getErrorMessage, getFieldErrors } from '../../lib/errors';
import { openReceiptWindow, writePengembalianReceipt } from '../../lib/receipt';
import { formatTanggal, today } from '../../lib/waktu';
import type { MyInventory } from '../../types/myInventory';
import type { PengembalianReceipt } from '../../types/peminjaman';

interface UserReturnModalProps {
  open: boolean;
  inventory: MyInventory | null; // barang utama yang mau dikembalikan
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu pengembalian tersimpan (untuk memuat ulang dashboard)
}

const PHOTO_COUNT = 3;

// modal "Kembalikan" versi user: tidak ada nomor penerimaan dan tanggal (otomatis hari ini), cukup catatan + 3 foto kondisi barang.
// Kelengkapan ikut dikembalikan. Setelah berhasil, struk pengembalian dibuka
export default function UserReturnModal({ open, inventory, onClose, onSaved }: UserReturnModalProps) {
  const formId = useId();
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [catatanError, setCatatanError] = useState('');
  const [files, setFiles] = useState<File[]>([]); // 3 foto kondisi barang saat dikembalikan
  const [fotoError, setFotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [blockedReceipt, setBlockedReceipt] = useState<PengembalianReceipt | null>(null); // struk yang popup-nya diblokir browser
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCatatan('');
      setError('');
      setCatatanError('');
      setFiles([]);
      setFotoError('');
      setBlockedReceipt(null);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventory || saving) return;

    // cek di browser dulu supaya pesannya langsung muncul
    if (files.length !== PHOTO_COUNT) {
      setFotoError(`Foto kondisi barang saat dikembalikan harus tepat ${PHOTO_COUNT} foto.`);
      return;
    }

    setSaving(true);
    setError('');
    setCatatanError('');
    setFotoError('');
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const data = new FormData();
      data.append('tanggal_pengembalian', today());
      if (catatan.trim()) data.append('catatan', catatan.trim());
      files.forEach((f) => data.append('foto[]', f));

      const receipt = await myInventoryService.kembalikan(inventory.id, data);
      onSaved();
      if (win) {
        writePengembalianReceipt(win, receipt);
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
      const { inventory: inventoryError, catatan: fieldError, foto: fotoFieldError, ...rest } = fieldErrors;
      if (fieldError) setCatatanError(fieldError);
      if (fotoFieldError) setFotoError(fotoFieldError);
      if (inventoryError) setError(inventoryError);
      else if (!fieldError && !fotoFieldError) setError(Object.values(rest)[0] ?? getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openBlockedReceipt = () => {
    if (!blockedReceipt) return;
    const win = openReceiptWindow();
    if (win) writePengembalianReceipt(win, blockedReceipt);
  };

  const subtitle = inventory ? `${inventory.kode_inventory}${inventory.nama ? ` - ${inventory.nama}` : ''}` : undefined;

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Kembalikan inventory"
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
            <button type="submit" form={formId} className={btnSolid} disabled={saving || !inventory}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Kembalikan Unit
            </button>
          </>
        )
      }
    >
      {blockedReceipt ? (
        <p className="text-sm text-ink-soft">
          Pengembalian <span className="font-semibold text-ink">{blockedReceipt.nomor_penerimaan}</span> sudah tersimpan,
          tapi jendela struk diblokir browser. Klik <span className="font-semibold text-ink">Buka Struk</span> untuk menampilkannya.
        </p>
      ) : (
        <form id={formId} onSubmit={submit} className="flex flex-col gap-3">
          {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

          {inventory && (
            <p className="rounded-lg bg-hover px-3 py-2 text-xs text-ink-soft">
              Kamu memakai barang ini
              {inventory.tanggal_penerimaan && <> sejak {formatTanggal(inventory.tanggal_penerimaan)}</>}.
              {inventory.kelengkapan.length > 0 && <> Kelengkapan ({inventory.kelengkapan.length}) ikut dikembalikan.</>}{' '}
              Tanggal pengembalian dicatat hari ini.
            </p>
          )}

          <FormField label="Catatan Kembali" icon={MessageSquare} error={catatanError}>
            <textarea
              value={catatan}
              onChange={(e) => { setCatatan(e.target.value); setCatatanError(''); }}
              rows={3}
              maxLength={1000}
              placeholder="Contoh: kondisi barang saat dikembalikan"
              className={textareaClass}
            />
          </FormField>

          <PhotoUploadField
            label="Foto Kondisi Barang Saat Dikembalikan"
            required
            max={PHOTO_COUNT}
            files={files}
            onChange={(next) => { setFiles(next); setFotoError(''); }}
            error={fotoError}
            disabled={saving}
          />
        </form>
      )}
    </Modal>
  );
}