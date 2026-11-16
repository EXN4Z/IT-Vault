import { useEffect, useId, useState, type FormEvent } from 'react';
import { CalendarDays, Hash, Loader2, MessageSquare } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import { DatePicker, FormField, inputClass, textareaClass } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { peminjamanService } from '../../../services/peminjamanService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { formatTanggal, openReceiptWindow, writePengembalianReceipt } from '../../../lib/receipt';
import type { InventoryRow } from '../../../types/inventory';
import type { PengembalianReceipt, SerahTerimaReceipt } from '../../../types/peminjaman';

interface InventoryReturnModalProps {
  open: boolean;
  inventory: InventoryRow | null; // barang utama yang mau dikembalikan
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu pengembalian tersimpan (untuk memuat ulang tabel)
}

interface FormState {
  nomor_penerimaan: string;
  tanggal_pengembalian: string;
  catatan: string;
}

// tanggal hari ini 'YYYY-MM-DD' (pakai jam lokal, bukan toISOString yang bisa mundur sehari)
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const emptyForm = (): FormState => ({ nomor_penerimaan: '', tanggal_pengembalian: today(), catatan: '' });

// modal "Kembalikan": isi nomor penerimaan (dari struk serah terima), tanggal, catatan; status tidak dipilih,
// server yang menentukan (barang yang dipinjam jadi tersedia, kelengkapan yang rusak / diperbaiki tetap). Setelah berhasil struk pengembalian dibuka
export default function InventoryReturnModal({ open, inventory, onClose, onSaved }: InventoryReturnModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [info, setInfo] = useState<SerahTerimaReceipt | null>(null); // peminjaman yang sedang berjalan + kelengkapannya sekarang
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [blockedReceipt, setBlockedReceipt] = useState<PengembalianReceipt | null>(null); // struk yang popup-nya diblokir browser
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(emptyForm());
      setInfo(null); // dimuat ulang tiap dibuka
      setErrors({});
      setError('');
      setBlockedReceipt(null);
    }
  }

  // ambil peminjaman yang sedang berjalan (untuk daftar kelengkapan) tiap modal dibuka
  useEffect(() => {
    if (!open || !inventory || info) return;
    let ignore = false;
    peminjamanService
      .struk(inventory.id)
      .then((res) => { if (!ignore) setInfo(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, inventory, info]);

  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventory || !info || saving) return;

    // cek di browser dulu supaya pesannya langsung muncul
    const found: Record<string, string> = {};
    if (!form.nomor_penerimaan.trim()) found.nomor_penerimaan = 'Nomor penerimaan wajib diisi.';
    if (!form.tanggal_pengembalian) found.tanggal_pengembalian = 'Tanggal pengembalian wajib diisi.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setError('');
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const receipt = await peminjamanService.kembalikan(inventory.id, {
        nomor_penerimaan: form.nomor_penerimaan.trim(),
        tanggal_pengembalian: form.tanggal_pengembalian,
        catatan: form.catatan.trim() || null,
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
      const { inventory: inventoryError, ...rest } = getFieldErrors(err);
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
            <button type="submit" form={formId} className={btnSolid} disabled={saving || !info}>
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

          {info && (
            <p className="rounded-lg bg-hover px-3 py-2 text-xs text-ink-soft">
              Dipinjam <span className="font-semibold text-ink">{info.peminjam.name}</span> sejak {formatTanggal(info.tanggal_penerimaan)}.
              Kelengkapan ({info.kelengkapan.length}) ikut dikembalikan.
            </p>
          )}

          <FormField label="Nomor Penerimaan" required icon={Hash} error={errors.nomor_penerimaan}>
            <input
              value={form.nomor_penerimaan}
              onChange={(e) => setField('nomor_penerimaan')(e.target.value)}
              placeholder="Sesuai struk serah terima, contoh: 95AYFF-131126"
              className={inputClass}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Tanggal Pengembalian" required icon={CalendarDays} error={errors.tanggal_pengembalian}>
            <DatePicker value={form.tanggal_pengembalian} onChange={setField('tanggal_pengembalian')} />
          </FormField>

          <FormField label="Catatan Kembali" icon={MessageSquare} error={errors.catatan}>
            <textarea
              value={form.catatan}
              onChange={(e) => setField('catatan')(e.target.value)}
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