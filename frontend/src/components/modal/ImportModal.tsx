import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileSpreadsheet, Info, Loader2, Trash2, Upload } from 'lucide-react';
import Modal from './Modal';
import { btnOutline, btnSolid } from '../ui/buttonStyles';
import Tooltip from '../ui/Tooltip';

// format file yang boleh diunggah dan batas ukurannya
const ACCEPT = '.xlsx,.xls,.csv';
const ALLOWED_EXT = ['xlsx', 'xls', 'csv'];
const MAX_SIZE_MB = 5;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requiredColumns?: string[]; // daftar kolom wajib, ditampilkan sebagai petunjuk
  onSubmit?: (file: File) => void; // kirim file ke API
  loading?: boolean; // true selama file diproses server
  error?: string; // pesan error dari server
  details?: string[]; // rincian error (misal per baris)
}

// ukuran file yang enak dibaca (KB / MB)
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// =============================================================================
// IMPORT MODAL: unggah file Excel / CSV, lalu kirim file lewat onSubmit
// - alur: pilih / seret file -> file tampil di daftar -> klik Import
// - modal ini hanya mengecek format dan ukuran file; isi file dicek server
// =============================================================================
export default function ImportModal({
  open,
  onClose,
  title = 'Import data',
  description = 'Unggah file Excel atau CSV untuk menambah data sekaligus.',
  requiredColumns,
  onSubmit,
  loading = false,
  error: serverError,
  details = [],
}: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: kosongkan pilihan file sebelumnya
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFile(null);
      setError('');
      setDragging(false);
    }
  }

  // cek format + ukuran, lalu simpan file kalau lolos
  const pickFile = (picked?: File) => {
    if (!picked) return;
    const ext = picked.name.split('.').pop()?.toLowerCase() ?? '';

    if (!ALLOWED_EXT.includes(ext)) {
      setError('Format file harus .xlsx, .xls, atau .csv.');
      return;
    }
    if (picked.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_SIZE_MB} MB.`);
      return;
    }

    setError('');
    setFile(picked);
  };

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0]);
    e.target.value = ''; // supaya file yang sama bisa dipilih ulang setelah dihapus
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const removeFile = () => {
    setFile(null);
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!loading) onClose(); }}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={loading}>Batal</button>
          <button type="button" className={btnSolid} disabled={!file || loading} onClick={() => file && onSubmit?.(file)}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}Import
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ----- area unggah (klik atau seret file) ----- */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center outline-none transition focus-visible:border-accent ${
            dragging ? 'border-accent bg-hover' : 'border-line hover:bg-hover'
          }`}
        >
          <span className="mb-2.5 grid size-11 place-items-center rounded-full bg-selected text-ink-muted">
            <Upload size={18} />
          </span>
          <p className="text-xs font-semibold">Seret file ke sini</p>
          <p className="mt-1 text-[11px] text-ink-muted">
            atau <span className="font-semibold text-accent">klik untuk memilih file</span>
          </p>
          <p className="mt-2 text-[11px] text-ink-muted">.xlsx, .xls, .csv (maks. {MAX_SIZE_MB} MB)</p>
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleSelect} />
        </div>

        {/* pesan error validasi file */}
        {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

        {/* pesan error dari server (+ rincian per baris kalau ada) */}
        {serverError && (
          <div className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">
            <p>{serverError}</p>
            {details.length > 0 && (
              <ul className="mt-1.5 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4">
                {details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* ----- file yang dipilih ----- */}
        {file && (
          <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-selected text-success">
              <FileSpreadsheet size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <Tooltip className="block min-w-0" onlyWhenTruncated>
                <p className="truncate text-xs font-semibold">{file.name}</p>
              </Tooltip>
              <p className="mt-0.5 text-[11px] text-ink-muted">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              aria-label="Hapus file"
              onClick={removeFile}
              className="cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* ----- catatan ----- */}
        <p className="flex items-start gap-1.5 text-[11px] text-ink-muted">
          <Info size={13} className="mt-px shrink-0" />
          Baris pertama harus berisi nama kolom
          {requiredColumns && requiredColumns.length > 0 && <> (kolom wajib: {requiredColumns.join(', ')})</>}
          . Data yang sudah ada tidak akan terhapus.
        </p>
      </div>
    </Modal>
  );
}