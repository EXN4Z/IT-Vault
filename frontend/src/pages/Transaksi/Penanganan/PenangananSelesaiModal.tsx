import { useId, useState, type FormEvent } from 'react';
import { Banknote, CalendarDays, ClipboardCheck, Cpu, ExternalLink, Loader2, MessageSquare, Wrench } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import Badge from '../../../components/ui/Badge';
import { ComboBox, DatePicker, FormField, inputClass, textareaClass } from '../../../components/form';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage, getFieldErrors } from '../../../lib/errors';
import { openReceiptWindow, writePenangananReceipt } from '../../../lib/receipt';
import { rupiah, today, tglJam } from '../../../lib/waktu';
import { HASIL_PENANGANAN, STATUS_PENANGANAN, type HasilPenanganan, type Penanganan } from '../../../types/penanganan';

interface PenangananSelesaiModalProps {
  open: boolean;
  penanganan: Penanganan | null; // penanganan yang mau diselesaikan (status diterima)
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu perbaikan diselesaikan (untuk memuat ulang tabel)
}

const HASIL_OPTIONS = HASIL_PENANGANAN.map((h) => ({ value: h.key, label: h.label }));

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-ink-muted';
const rowClass = 'flex items-start justify-between gap-4 border-t border-line py-2 text-xs';

// modal "Selesaikan perbaikan": detail laporan + isian hasil, tanggal selesai, biaya, dan catatan.
// Nomor struk dibuat server; begitu berhasil, struk langsung terbuka di jendela baru (berhasil maupun rusak berat).
// Status barang: berhasil -> kembali dipinjam / tersedia, tidak bisa diperbaiki -> Rusak Berat
export default function PenangananSelesaiModal({ open, penanganan, onClose, onSaved }: PenangananSelesaiModalProps) {
  const formId = useId();
  const [hasil, setHasil] = useState<HasilPenanganan>('berhasil');
  const [tanggal, setTanggal] = useState(today);
  const [hargaJasa, setHargaJasa] = useState(''); // hanya angka, kosong = 0
  const [biayaKomponen, setBiayaKomponen] = useState('');
  const [catatan, setCatatan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan form
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setHasil('berhasil');
      setTanggal(today());
      setHargaJasa('');
      setBiayaKomponen('');
      setCatatan('');
      setErrors({});
      setError('');
    }
  }

  const clearError = (field: string) => setErrors((prev) => ({ ...prev, [field]: '' }));

  const rusakBerat = hasil === 'tidak_bisa_diperbaiki';
  // kedua kolom kosong (boleh kalau rusak berat) -> total '-'
  const totalBiaya = hargaJasa === '' && biayaKomponen === '' ? null : Number(hargaJasa || 0) + Number(biayaKomponen || 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!penanganan || saving) return;

    // cek isian dulu; kalau ada yang salah, jendela struk belum perlu dibuka
    const found: Record<string, string> = {};
    if (!tanggal) found.tanggal_selesai = 'Tanggal selesai wajib diisi.';
    else if (penanganan.tanggal_diterima && tanggal < penanganan.tanggal_diterima) found.tanggal_selesai = 'Tanggal selesai tidak boleh sebelum tanggal diterima.';
    if (!rusakBerat && hargaJasa === '') found.harga_jasa = 'Harga jasa wajib diisi (isi 0 kalau tanpa biaya).';
    if (!rusakBerat && biayaKomponen === '') found.biaya_komponen = 'Biaya komponen wajib diisi (isi 0 kalau tanpa komponen).';
    if (rusakBerat && !catatan.trim()) found.catatan = 'Catatan (alasan tidak bisa diperbaiki) wajib diisi.';
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    // jendela struk harus dibuka langsung di klik ini (sebelum await), kalau tidak diblokir popup blocker
    const win = openReceiptWindow();

    setSaving(true);
    setError('');
    try {
      const selesai = await penangananService.selesai(penanganan.id, {
        hasil,
        tanggal_selesai: tanggal,
        harga_jasa: hargaJasa === '' ? null : Number(hargaJasa),
        biaya_komponen: biayaKomponen === '' ? null : Number(biayaKomponen),
        catatan: catatan.trim() || null,
      });
      if (win) writePenangananReceipt(win, selesai);
      onSaved();
      onClose();
    } catch (err) {
      win?.close();
      const { penanganan: penangananError, ...rest } = getFieldErrors(err);
      if (penangananError) setError(penangananError);
      if (Object.keys(rest).length > 0) setErrors(rest);
      else if (!penangananError) setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const p = penanganan;
  const barang = p?.inventory;
  const status = p ? STATUS_PENANGANAN.find((s) => s.key === p.status) : undefined;

  // baris "Data Barang" (label, nilai)
  const dataBarang: [string, string][] = [
    ['Kode inventory', barang?.kode_inventory ?? '-'],
    ['Nama unit', barang?.nama ?? '-'],
    ['Merk & tipe', [barang?.merk, barang?.type].filter(Boolean).join(' · ') || '-'],
    ['Serial number', barang?.serial_number ?? '-'],
    ['Warna', barang?.warna ?? '-'],
    ['Status sebelum dilapor', p ? p.status_sebelum.replace(/_/g, ' ') : '-'],
  ];

  // baris "Riwayat" (label, nilai)
  const riwayat: [string, string][] = p
    ? [
        ['Dilaporkan', `${tglJam(p.tanggal_lapor, p.lapor_at)} · ${p.pelapor ?? '-'}`],
        ['Diterima', `${tglJam(p.tanggal_diterima, p.diterima_at)} · ${p.penerima ?? '-'}`],
      ]
    : [];

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Selesaikan perbaikan"
      eyebrow={p ? [barang?.kode_inventory, p.jenis_label].filter(Boolean).join(' · ') : undefined}
      titleExtra={p && <Badge dot={status?.dot ?? 'bg-ink-muted'}>{status?.label ?? p.status}</Badge>}
      size="lg"
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" form={formId} className={btnSolid} disabled={saving || !p}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Selesaikan & Cetak Struk
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

        {p && (
          <>
            {/* foto kerusakan + keluhan */}
            <div className="flex gap-4">
              <a
                href={p.foto_url}
                target="_blank"
                rel="noreferrer"
                title="Buka foto ukuran penuh"
                className="group relative block h-36 w-48 shrink-0 overflow-hidden rounded-lg border border-line bg-field"
              >
                <img src={p.foto_url} alt="Foto kerusakan" className="size-full object-cover" />
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
                  <ExternalLink size={10} />Perbesar
                </span>
              </a>
              <div className="min-w-0 flex-1">
                <h3 className={`${sectionTitle} mb-1 flex items-center gap-1.5`}><Wrench size={12} />Keluhan</h3>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-hover px-3 py-2.5 text-xs text-ink">{p.keluhan}</p>
                <p className="mt-2 text-[11px] text-ink-muted">Jenis kerusakan: <span className="font-semibold text-ink-soft">{p.jenis_label}</span></p>
              </div>
            </div>

            {/* data barang */}
            <section>
              <h3 className={`${sectionTitle} mb-1`}>Data Barang</h3>
              <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {dataBarang.map(([label, nilai]) => (
                  <div key={label} className={rowClass}>
                    <dt className="shrink-0 text-ink-soft">{label}</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-ink">{nilai}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* riwayat singkat: dilaporkan + diterima */}
            <section>
              <h3 className={`${sectionTitle} mb-1`}>Riwayat Penanganan</h3>
              <dl>
                {riwayat.map(([label, nilai]) => (
                  <div key={label} className={rowClass}>
                    <dt className="shrink-0 text-ink-soft">{label}</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-ink">{nilai}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}

        {/* isian penyelesaian */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Hasil Perbaikan" required icon={ClipboardCheck} error={errors.hasil}>
            <ComboBox
              options={HASIL_OPTIONS}
              value={hasil}
              onChange={(v) => { setHasil(v as HasilPenanganan); clearError('hasil'); clearError('catatan'); clearError('harga_jasa'); clearError('biaya_komponen'); }}
              placeholder="Pilih hasil"
              searchable={false}
            />
          </FormField>

          <FormField label="Tanggal Selesai" required icon={CalendarDays} error={errors.tanggal_selesai}>
            <DatePicker value={tanggal} onChange={(v) => { setTanggal(v); clearError('tanggal_selesai'); }} />
          </FormField>

          <FormField label="Harga Jasa (Rp)" required={!rusakBerat} icon={Banknote} error={errors.harga_jasa}>
            <input
              value={hargaJasa}
              onChange={(e) => { setHargaJasa(e.target.value.replace(/\D/g, '')); clearError('harga_jasa'); }}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
          </FormField>

          <FormField label="Biaya Komponen (Rp)" required={!rusakBerat} icon={Cpu} error={errors.biaya_komponen}>
            <input
              value={biayaKomponen}
              onChange={(e) => { setBiayaKomponen(e.target.value.replace(/\D/g, '')); clearError('biaya_komponen'); }}
              inputMode="numeric"
              placeholder="0"
              className={inputClass}
            />
          </FormField>
        </div>

        <p className="flex items-center justify-between rounded-lg bg-hover px-3 py-2.5 text-xs text-ink-soft">
          <span>Total biaya</span>
          <span className="font-semibold text-ink">{rupiah(totalBiaya)}</span>
        </p>

        <FormField label={rusakBerat ? 'Catatan (alasan tidak bisa diperbaiki)' : 'Catatan'} required={rusakBerat} icon={MessageSquare} error={errors.catatan}>
          <textarea
            value={catatan}
            onChange={(e) => { setCatatan(e.target.value); clearError('catatan'); }}
            rows={3}
            maxLength={1000}
            placeholder={rusakBerat ? 'Contoh: motherboard korslet, biaya perbaikan melebihi nilai barang' : 'Contoh: ganti thermal paste dan bersihkan kipas'}
            className={textareaClass}
          />
        </FormField>

        <p className="text-[11px] text-ink-muted">
          {rusakBerat
            ? 'Status barang menjadi Rusak Berat. Harga jasa dan biaya komponen boleh dikosongkan (di struk tampil "-"). Nomor struk dibuat otomatis dan struk langsung terbuka.'
            : 'Status barang kembali ke Dipinjam (kalau masih dipegang peminjam) atau Tersedia. Nomor struk dibuat otomatis dan struk langsung terbuka.'}
        </p>
      </form>
    </Modal>
  );
}