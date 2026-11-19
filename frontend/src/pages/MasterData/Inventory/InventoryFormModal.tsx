import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import FormField, { inputClass, textareaClass } from '../../../components/form/FormField';
import ComboBox, { type ComboboxOption } from '../../../components/form/ComboBox';
import DatePicker from '../../../components/form/DatePicker';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { inventoryService } from '../../../services/inventoryService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import type { InventoryOptions, InventoryRow } from '../../../types/inventory';
import type { Option } from '../../../types/user';

interface InventoryFormModalProps {
  open: boolean;
  inventory: InventoryRow | null; // null = tambah baru, ada isi = ubah
  onClose: () => void;
  onSaved: () => void;
}

// batas foto: samakan dengan aturan di backend (max:2048 KB, jpg/png/webp)
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const FOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// semua isi form disimpan sebagai string dulu, baru diubah ke angka / null saat dikirim
interface FormState {
  nama: string;
  kategori_id: string;
  merk: string;
  type: string;
  warna: string;
  serial_number: string;
  jumlah: string;
  parent_id: string;
  perusahaan_id: string;
  supplier_id: string;
  tanggal_input: string;
  tanggal_garansi: string;
  tanggal_invoice: string;
  no_surat_jalan: string;
  no_good_receive: string;
  keterangan: string;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = (): FormState => ({
  nama: '', kategori_id: '', merk: '', type: '', warna: '', serial_number: '', jumlah: '1',
  parent_id: '', perusahaan_id: '', supplier_id: '', tanggal_input: today(), tanggal_garansi: '', tanggal_invoice: '',
  no_surat_jalan: '', no_good_receive: '', keterangan: '',
});

const idToStr = (id: number | null) => (id === null ? '' : String(id));
const strToId = (v: string) => (v === '' ? null : Number(v));
const orNull = (v: string) => v.trim() || null;

const toForm = (i: InventoryRow | null): FormState =>
  i
    ? {
        nama: i.nama ?? '',
        kategori_id: idToStr(i.kategori_id),
        merk: i.merk ?? '',
        type: i.type ?? '',
        warna: i.warna ?? '',
        serial_number: i.serial_number ?? '',
        jumlah: String(i.jumlah),
        parent_id: idToStr(i.parent_id),
        perusahaan_id: idToStr(i.perusahaan_id),
        supplier_id: idToStr(i.supplier_id),
        tanggal_input: i.tanggal_input ?? '',
        tanggal_garansi: i.tanggal_garansi ?? '',
        tanggal_invoice: i.tanggal_invoice ?? '',
        no_surat_jalan: i.no_surat_jalan ?? '',
        no_good_receive: i.no_good_receive ?? '',
        keterangan: i.keterangan ?? '',
      }
    : emptyForm();

// data dari server ({ id, nama }) -> pilihan ComboBox ({ value, label })
const toOptions = (items: Option[] | undefined): ComboboxOption[] =>
  items?.map((o) => ({ value: String(o.id), label: o.nama })) ?? [];

// form tambah / ubah inventory, dibungkus Modal
export default function InventoryFormModal({ open, inventory, onClose, onSaved }: InventoryFormModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [options, setOptions] = useState<InventoryOptions | null>(null);

  // ===== foto =====
  const [fotoBaru, setFotoBaru] = useState<File | null>(null); // file yang baru dipilih (belum diupload)
  const [previewBaru, setPreviewBaru] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false); // minta server membuang foto yang sudah tersimpan
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // preview foto yang baru dipilih; URL-nya dilepas lagi saat foto diganti / modal ditutup
  useEffect(() => {
    if (!fotoBaru) return;
    const url = URL.createObjectURL(fotoBaru);
    setPreviewBaru(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoBaru]);

  // yang ditampilkan: foto baru > foto tersimpan (kecuali diminta dihapus) > kosong
  const previewUrl = fotoBaru ? previewBaru : hapusFoto ? null : (inventory?.foto_url ?? null);

  const opts = useMemo(() => ({
    kategori: toOptions(options?.kategori),
    perusahaan: toOptions(options?.perusahaan),
    supplier: toOptions(options?.supplier),
    // barang utama: semua inventory kecuali dirinya sendiri
    parent: (options?.inventory ?? [])
      .filter((p) => p.id !== inventory?.id)
      .map((p) => ({ value: String(p.id), label: p.nama ? `${p.kode_inventory} - ${p.nama}` : p.kode_inventory })),
  }), [options, inventory?.id]);

  // tiap modal dibuka: isi ulang form (kosong untuk tambah, data lama untuk ubah)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(toForm(inventory));
      setErrors({});
      setError('');
      setFotoBaru(null);
      setHapusFoto(false);
      setOptions(null); // dimuat ulang tiap dibuka, supaya kategori / barang utama yang baru dibuat ikut muncul
    }
  }

  // ambil isi dropdown tiap modal dibuka
  useEffect(() => {
    if (!open || options) return;
    let ignore = false;
    inventoryService
      .options()
      .then((res) => { if (!ignore) setOptions(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, options]);

  // dipakai ComboBox / DatePicker: onChange-nya langsung memberi nilai (string), bukan event
  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const bind = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(key)(e.target.value),
  });

  // pilih foto: cek tipe & ukuran dulu di browser, supaya tidak menunggu penolakan dari server
  const pilihFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya file yang sama bisa dipilih ulang
    if (!file) return;

    if (!FOTO_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, foto: 'Foto harus berformat JPG, PNG, atau WEBP.' }));
      return;
    }
    if (file.size > MAX_FOTO_BYTES) {
      setErrors((prev) => ({ ...prev, foto: 'Ukuran foto maksimal 2 MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, foto: '' }));
    setFotoBaru(file);
    setHapusFoto(false);
  };

  // buang foto: kalau sudah ada foto tersimpan, server diminta menghapusnya saat disimpan
  const lepasFoto = () => {
    setFotoBaru(null);
    setErrors((prev) => ({ ...prev, foto: '' }));
    if (inventory?.foto_url) setHapusFoto(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    // cek cepat di frontend supaya tidak perlu bolak-balik ke server
    const local: Record<string, string> = {};
    if (!form.kategori_id) local.kategori_id = 'Kategori wajib dipilih.';
    if (!form.jumlah || Number(form.jumlah) < 1) local.jumlah = 'Jumlah minimal 1.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setSaving(true);
    setErrors({});
    setError('');

    // kolom opsional yang dikosongkan dikirim sebagai null
    const payload = {
      parent_id: strToId(form.parent_id),
      kategori_id: Number(form.kategori_id),
      nama: orNull(form.nama),
      warna: orNull(form.warna),
      serial_number: orNull(form.serial_number),
      jumlah: Number(form.jumlah),
      tanggal_garansi: form.tanggal_garansi || null,
      tanggal_input: form.tanggal_input || null,
      tanggal_invoice: form.tanggal_invoice || null,
      merk: orNull(form.merk),
      type: orNull(form.type),
      perusahaan_id: strToId(form.perusahaan_id),
      keterangan: orNull(form.keterangan),
      supplier_id: strToId(form.supplier_id),
      no_surat_jalan: orNull(form.no_surat_jalan),
      no_good_receive: orNull(form.no_good_receive),
    };

    try {
      // karena membawa file, body dikirim sebagai FormData (multipart)
      const body = new FormData();
      // null dikirim sebagai string kosong; Laravel mengubahnya kembali jadi null
      Object.entries(payload).forEach(([key, value]) => body.append(key, value === null ? '' : String(value)));
      if (fotoBaru) body.append('foto', fotoBaru);
      else if (hapusFoto) body.append('hapus_foto', '1');

      if (inventory) await inventoryService.update(inventory.id, body);
      else await inventoryService.create(body);
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
      title={inventory ? `Ubah inventory ${inventory.kode_inventory}` : 'Tambah inventory'}
      description={inventory ? undefined : 'Kode inventory dibuat otomatis saat disimpan.'}
      size="lg"
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

        <FormField label="Nama" error={errors.nama} className="col-span-2">
          <input {...bind('nama')} placeholder="Nama inventory" className={inputClass} />
        </FormField>

        {/* foto: kotak pratinjau + tombol pilih / ganti / hapus */}
        <FormField label="Foto" error={errors.foto} className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-hover text-ink-muted">
              {previewUrl ? (
                <img src={previewUrl} alt="Foto inventory" className="size-full object-cover" />
              ) : (
                <ImagePlus size={22} />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnOutline}
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={saving}
                >
                  {previewUrl ? 'Ganti foto' : 'Pilih foto'}
                </button>
                {previewUrl && (
                  <button type="button" className={btnOutline} onClick={lepasFoto} disabled={saving}>
                    <Trash2 size={14} />
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-muted">JPG, PNG, atau WEBP, maksimal 2 MB.</p>
            </div>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={pilihFoto}
              className="hidden"
            />
          </div>
        </FormField>

        <FormField label="Kategori" required error={errors.kategori_id} className="col-span-2">
          <ComboBox options={opts.kategori} value={form.kategori_id} onChange={setField('kategori_id')} placeholder="Pilih kategori" searchPlaceholder="Cari kategori..." />
        </FormField>

        <FormField label="Merk" error={errors.merk}>
          <input {...bind('merk')} placeholder="Merk" className={inputClass} />
        </FormField>

        <FormField label="Type" error={errors.type}>
          <input {...bind('type')} placeholder="Type / model" className={inputClass} />
        </FormField>

        <FormField label="Serial number" error={errors.serial_number}>
          <input {...bind('serial_number')} placeholder="Serial number" className={inputClass} />
        </FormField>

        <FormField label="Warna" error={errors.warna}>
          <input {...bind('warna')} placeholder="Warna" className={inputClass} />
        </FormField>

        <FormField label="Jumlah" required error={errors.jumlah}>
          <input {...bind('jumlah')} type="number" min={1} step={1} placeholder="1" className={inputClass} />
        </FormField>

        <FormField label="Barang utama" error={errors.parent_id}>
          <ComboBox options={opts.parent} value={form.parent_id} onChange={setField('parent_id')} placeholder="Tanpa barang utama" searchPlaceholder="Cari kode / nama..." clearable />
        </FormField>

        <FormField label="Perusahaan" error={errors.perusahaan_id}>
          <ComboBox options={opts.perusahaan} value={form.perusahaan_id} onChange={setField('perusahaan_id')} placeholder="Pilih perusahaan" searchPlaceholder="Cari perusahaan..." clearable />
        </FormField>

        <FormField label="Supplier" error={errors.supplier_id}>
          <ComboBox options={opts.supplier} value={form.supplier_id} onChange={setField('supplier_id')} placeholder="Pilih supplier" searchPlaceholder="Cari supplier..." clearable />
        </FormField>

        <FormField label="Tanggal input" error={errors.tanggal_input}>
          <DatePicker value={form.tanggal_input} onChange={setField('tanggal_input')} clearable />
        </FormField>

        <FormField label="Tanggal invoice" error={errors.tanggal_invoice}>
          <DatePicker value={form.tanggal_invoice} onChange={setField('tanggal_invoice')} clearable />
        </FormField>

        <FormField label="Tanggal garansi" error={errors.tanggal_garansi} className="col-span-2">
          <DatePicker
            value={form.tanggal_garansi}
            onChange={setField('tanggal_garansi')}
            maxYear={new Date().getFullYear() + 10}
            clearable
          />
        </FormField>

        <FormField label="No. surat jalan" error={errors.no_surat_jalan}>
          <input {...bind('no_surat_jalan')} placeholder="No. surat jalan" className={inputClass} />
        </FormField>

        <FormField label="No. good receive" error={errors.no_good_receive}>
          <input {...bind('no_good_receive')} placeholder="No. good receive" className={inputClass} />
        </FormField>

        <FormField label="Keterangan" error={errors.keterangan} className="col-span-2">
          <textarea {...bind('keterangan')} rows={3} placeholder="Catatan tambahan" className={textareaClass} />
        </FormField>
      </form>
    </Modal>
  );
}