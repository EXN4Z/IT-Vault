import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  BadgeCheck, Building2, CalendarDays, Hash, Layers, Loader2, Lock, Mail, Phone, ShieldCheck, Store, User as UserIcon,
} from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import FormField, { inputClass } from '../../../components/form/FormField';
import Combobox, { type ComboboxOption } from '../../../components/form/ComboBox';
import DatePicker from '../../../components/form/DatePicker';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { userService } from '../../../services/userService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import type { Option, UserOptions, UserPayload, UserRow } from '../../../types/user';

interface DataUserFormModalProps {
  open: boolean;
  user: UserRow | null; // null = tambah baru, ada isi = ubah
  onClose: () => void;
  onSaved: () => void;
}

// semua isi form disimpan sebagai string dulu (cocok dengan <input> / <select>),
// baru diubah ke angka / null saat dikirim
interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  nik: string;
  tanggal_masuk: string;
  role_id: string;
  perusahaan_id: string;
  cabang_id: string;
  departemen_id: string;
  status: string;
}

const EMPTY: FormState = {
  name: '', email: '', password: '', phone: '', nik: '', tanggal_masuk: '',
  role_id: '', perusahaan_id: '', cabang_id: '', departemen_id: '', status: 'aktif',
};

const STATUS_OPTIONS: ComboboxOption[] = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' },
];

const idToStr = (id: number | null) => (id === null ? '' : String(id));
const strToId = (v: string) => (v === '' ? null : Number(v));

const toForm = (u: UserRow | null): FormState =>
  u
    ? {
        name: u.name,
        email: u.email,
        password: '', // password lama tidak pernah dikirim ke frontend
        phone: u.phone ?? '',
        nik: u.nik ?? '',
        tanggal_masuk: u.tanggal_masuk?.slice(0, 10) ?? '', // '2026-11-14T00:00...' -> '2026-11-14'
        role_id: idToStr(u.role_id),
        perusahaan_id: idToStr(u.perusahaan_id),
        cabang_id: idToStr(u.cabang_id),
        departemen_id: idToStr(u.departemen_id),
        status: u.status,
      }
    : EMPTY;

// data dari server ({ id, nama }) -> pilihan Combobox ({ value, label })
const toOptions = (items: Option[] | undefined): ComboboxOption[] =>
  items?.map((o) => ({ value: String(o.id), label: o.nama })) ?? [];

// form tambah / ubah user, dibungkus Modal
export default function DataUserFormModal({ open, user, onClose, onSaved }: DataUserFormModalProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [options, setOptions] = useState<UserOptions | null>(null);

  const isEdit = user !== null;

  const opts = useMemo(() => ({
    roles: toOptions(options?.roles),
    perusahaan: toOptions(options?.perusahaan),
    cabang: toOptions(options?.cabang),
    departemen: toOptions(options?.departemen),
  }), [options]);

  // tiap modal dibuka: isi ulang form (kosong untuk tambah, data lama untuk ubah)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(toForm(user));
      setErrors({});
      setError('');
    }
  }

  // ambil isi dropdown sekali saja, saat modal pertama kali dibuka
  useEffect(() => {
    if (!open || options) return;
    let ignore = false;
    userService
      .options()
      .then((res) => { if (!ignore) setOptions(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, options]);

  // dipakai Combobox: onChange-nya langsung memberi nilai (string), bukan event
  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const bind = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: '' }));
    },
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    // cek cepat di frontend supaya tidak perlu bolak-balik ke server
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = 'Nama wajib diisi.';
    if (!form.email.trim()) local.email = 'Email wajib diisi.';
    if (!isEdit && !form.password) local.password = 'Password wajib diisi.';
    if (!form.role_id) local.role_id = 'Role wajib dipilih.';
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setSaving(true);
    setErrors({});
    setError('');

    const payload: UserPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      nik: form.nik.trim() || null,
      tanggal_masuk: form.tanggal_masuk || null,
      role_id: strToId(form.role_id),
      perusahaan_id: strToId(form.perusahaan_id),
      cabang_id: strToId(form.cabang_id),
      departemen_id: strToId(form.departemen_id),
      status: form.status,
    };
    // password dikirim hanya kalau diisi (saat ubah, kosong = tidak diganti)
    if (form.password) payload.password = form.password;

    try {
      if (user) await userService.update(user.id, payload);
      else await userService.create(payload);
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
      title={user ? 'Ubah user' : 'Tambah user'}
      description="Data akun login dan karyawan."
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

        <FormField label="Nama" required icon={UserIcon} error={errors.name} className="col-span-2">
          <input {...bind('name')} placeholder="Nama lengkap" className={inputClass} />
        </FormField>

        <FormField label="Email" required icon={Mail} error={errors.email}>
          <input {...bind('email')} type="email" placeholder="nama@perusahaan.com" className={inputClass} />
        </FormField>

        <FormField label="Telepon" icon={Phone} error={errors.phone}>
          <input {...bind('phone')} placeholder="Nomor telepon" className={inputClass} />
        </FormField>

        <FormField label="Password" required={!isEdit} icon={Lock} error={errors.password} className="col-span-2">
          <input
            {...bind('password')}
            type="password"
            autoComplete="new-password"
            placeholder={isEdit ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'}
            className={inputClass}
          />
        </FormField>

        <FormField label="NIK" icon={Hash} error={errors.nik}>
          <input {...bind('nik')} placeholder="Nomor induk karyawan" className={inputClass} />
        </FormField>

        <FormField label="Tanggal masuk" icon={CalendarDays} error={errors.tanggal_masuk}>
          <DatePicker
            value={form.tanggal_masuk}
            onChange={setField('tanggal_masuk')}
            placeholder="Pilih tanggal"
            clearable
          />
        </FormField>

        <FormField label="Role" required icon={ShieldCheck} error={errors.role_id}>
          <Combobox
            options={opts.roles}
            value={form.role_id}
            onChange={setField('role_id')}
            placeholder="Pilih role"
            searchable={false}
          />
        </FormField>

        <FormField label="Status" required icon={BadgeCheck} error={errors.status}>
          <Combobox
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={setField('status')}
            searchable={false}
          />
        </FormField>

        <FormField label="Perusahaan" icon={Building2} error={errors.perusahaan_id}>
          <Combobox
            options={opts.perusahaan}
            value={form.perusahaan_id}
            onChange={setField('perusahaan_id')}
            placeholder="Pilih perusahaan"
            searchPlaceholder="Cari perusahaan..."
            clearable
          />
        </FormField>

        <FormField label="Cabang" icon={Store} error={errors.cabang_id}>
          <Combobox
            options={opts.cabang}
            value={form.cabang_id}
            onChange={setField('cabang_id')}
            placeholder="Pilih cabang"
            searchPlaceholder="Cari cabang..."
            clearable
          />
        </FormField>

        <FormField label="Departemen" icon={Layers} error={errors.departemen_id} className="col-span-2">
          <Combobox
            options={opts.departemen}
            value={form.departemen_id}
            onChange={setField('departemen_id')}
            placeholder="Pilih departemen"
            searchPlaceholder="Cari departemen..."
            clearable
          />
        </FormField>
      </form>
    </Modal>
  );
}