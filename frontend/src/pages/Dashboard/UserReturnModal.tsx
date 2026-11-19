import { useId, useState, type FormEvent } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import Modal from '../../components/modal/Modal';
import { FormField, textareaClass } from '../../components/form';
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

// modal "Kembalikan" versi user: tidak ada nomor penerimaan dan tanggal (otomatis hari ini), cukup konfirmasi + catatan.
// Kelengkapan ikut dikembalikan. Setelah berhasil, struk pengembalian dibuka
export default function UserReturnModal({ open, inventory, onClose, onSaved }: UserReturnModalProps) {
  const formId = useId();
  const [catatan, setCatatan] = useState('');
  const [error, setError] = useState('');
  const [catatanError, setCatatanError] = useState('');
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
      setBlockedReceipt(null);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventory || saving) return;

    setSaving(true);
    setError('');
    setCatatanError('');
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const receipt = await myInventoryService.kembalikan(inventory.id, {
        tanggal_pengembalian: today(),
        catatan: catatan.trim() || null,
      });
      onSaved();
      if (win) {
        writePengembalianReceipt(win, receipt);
        onClose();
      } else {
        setBlockedReceipt(receipt);
      }
    } catch (err) {
      win?.close();
      const { inventory: inventoryError, catatan: fieldError, ...rest } = getFieldErrors(err);
      if (fieldError) setCatatanError(fieldError);
      if (inventoryError) setError(inventoryError);
      else if (!fieldError) setError(Object.values(rest)[0] ?? getErrorMessage(err));
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
        </form>
      )}
    </Modal>
  );
}
