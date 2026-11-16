import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, type LucideIcon } from 'lucide-react';
import Modal from './Modal';
import { btnOutline, btnSolid } from '../ui/buttonStyles';

export type ExportFormat = 'xlsx' | 'csv';
export type ExportScope = 'all' | 'filtered' | 'page';

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  columns: string[]; // key kolom yang dipilih
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  columns?: ExportColumn[]; // kalau kosong, bagian "Kolom" disembunyikan
  total?: number; // jumlah data, ditampilkan di pilihan "Semua data"
  onSubmit?: (options: ExportOptions) => void; // nanti: panggil API export
  loading?: boolean; // true selama file diproses / diunduh
  error?: string; // pesan error dari server
}

// pilihan format file
const FORMATS: { value: ExportFormat; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'xlsx', label: 'Excel', hint: '.xlsx', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', hint: '.csv', icon: FileText },
];

// pilihan cakupan data
const SCOPES: { value: ExportScope; label: string; hint: string }[] = [
  { value: 'all', label: 'Semua data', hint: 'Seluruh data tanpa filter' },
  { value: 'filtered', label: 'Hasil pencarian', hint: 'Sesuai kata kunci yang sedang dipakai' },
  { value: 'page', label: 'Halaman ini saja', hint: 'Hanya baris yang tampil di tabel' },
];

// class kartu pilihan (radio disembunyikan, kartunya yang jadi tombol)
const optionCard =
  'cursor-pointer rounded-xl border border-line transition hover:bg-hover has-checked:border-accent has-checked:bg-hover has-focus-visible:border-accent';

// =============================================================================
// EXPORT MODAL: pilih format, cakupan data, dan kolom, lalu kirim pilihannya lewat onSubmit
// =============================================================================
export default function ExportModal({
  open,
  onClose,
  title = 'Export data',
  description = 'Pilih format dan data yang ingin diunduh.',
  columns = [],
  total,
  loading = false,
  error,
  onSubmit,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [scope, setScope] = useState<ExportScope>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kembali ke pilihan awal (semua kolom terpilih)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFormat('xlsx');
      setScope('all');
      setSelected(columns.map((c) => c.key));
    }
  }

  const allSelected = columns.length > 0 && selected.length === columns.length;

  const toggleColumn = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleAll = () => setSelected(allSelected ? [] : columns.map((c) => c.key));

  // tombol Export mati kalau tidak ada kolom yang dipilih
  const canSubmit = columns.length === 0 || selected.length > 0;

  return (
    <Modal
      open={open}
      onClose={() => { if (!loading) onClose(); }}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={loading}>Batal</button>
          <button
            type="button"
            className={btnSolid}
            disabled={!canSubmit || loading}
            onClick={() => onSubmit?.({ format, scope, columns: selected })}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}
        {/* ----- format file ----- */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-ink-soft">Format file</legend>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(({ value, label, hint, icon: Icon }) => (
              <label key={value} className={`${optionCard} flex flex-col items-center gap-1 px-2 py-3 text-center`}>
                <input
                  type="radio"
                  name="export-format"
                  value={value}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                  className="sr-only"
                />
                <Icon size={18} className="text-ink-muted" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[11px] text-ink-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ----- cakupan data ----- */}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-ink-soft">Data yang diexport</legend>
          <div className="space-y-2">
            {SCOPES.map(({ value, label, hint }) => (
              <label key={value} className={`${optionCard} flex items-center gap-3 px-3.5 py-2.5`}>
                <input
                  type="radio"
                  name="export-scope"
                  value={value}
                  checked={scope === value}
                  onChange={() => setScope(value)}
                  className="size-3.5 shrink-0 cursor-pointer accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="block text-[11px] text-ink-muted">{hint}</span>
                </span>
                {value === 'all' && total !== undefined && (
                  <span className="shrink-0 text-[11px] text-ink-muted">{total.toLocaleString('id-ID')} data</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        {/* ----- pilih kolom (hanya muncul kalau `columns` diisi) ----- */}
        {columns.length > 0 && (
          <fieldset>
            <div className="mb-2 flex items-center justify-between">
              <legend className="text-xs font-medium text-ink-soft">
                Kolom ({selected.length}/{columns.length})
              </legend>
              <button
                type="button"
                onClick={toggleAll}
                className="cursor-pointer text-[11px] font-semibold text-accent hover:underline"
              >
                {allSelected ? 'Hapus semua' : 'Pilih semua'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl border border-line p-3">
              {columns.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.key)}
                    onChange={() => toggleColumn(c.key)}
                    className="size-3.5 shrink-0 cursor-pointer accent-accent"
                  />
                  <span className="truncate">{c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </Modal>
  );
}