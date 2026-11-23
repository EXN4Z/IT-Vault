import { useEffect, useState } from 'react';
import { Download, Loader2, Map as MapIcon, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import SearchField from '../../../components/ui/SearchField';
import Modal from '../../../components/modal/Modal';
import ImportModal from '../../../components/modal/ImportModal';
import ExportModal, { type ExportColumn, type ExportOptions } from '../../../components/modal/ExportModal';
import { btnCreate, btnDanger, btnOutline } from '../../../components/ui/buttonStyles';
import { cabangService } from '../../../services/cabangService';
import { getErrorList, getErrorMessage } from '../../../lib/errors';
import { saveBlob } from '../../../lib/downloadExport';
import type { Cabang } from '../../../types/cabang';
import CabangFormModal from './CabangFormModal';

// kolom yang bisa dipilih di modal export
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'link', label: 'Link' },
  { key: 'telepon', label: 'Telepon' },
];

// link hanya dijadikan tombol kalau benar-benar alamat http(s), supaya isi aneh (misal "javascript:...") tidak bisa diklik
const isHttpUrl = (v: string | null): v is string => !!v && /^https?:\/\//i.test(v);

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink';

export default function CabangPage() {
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [rows, setRows] = useState<Cabang[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // naikkan untuk memuat ulang tabel

  // modal tambah / ubah (`editing` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cabang | null>(null);

  // modal import / export
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false); // true selama file diproses server
  const [importError, setImportError] = useState('');
  const [importDetails, setImportDetails] = useState<string[]>([]); // rincian error per baris
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false); // true selama file diproses / diunduh
  const [exportError, setExportError] = useState('');

  // modal konfirmasi hapus
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cabang | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handlePerPageChange = (next: number) => {
    setPerPage(next);
    setPage(1);
  };

  // tunda pencarian 300ms setelah berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ambil data saat halaman / pencarian berganti atau tabel perlu dimuat ulang
  useEffect(() => {
    let ignore = false; // kalau request lama selesai belakangan, hasilnya dibuang
    setLoading(true);
    setError('');
    cabangService
      .list(page, perPage, search)
      .then((res) => {
        if (ignore) return;
        setRows(res.data);
        setPageCount(res.last_page);
        setTotal(res.total);
      })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, perPage, search, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: Cabang) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  };

  // kirim pilihan di ExportModal ke backend, lalu unduh file yang dihasilkan
  const handleExport = async (opts: ExportOptions) => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await cabangService.export({
        format: opts.format,
        scope: opts.scope,
        columns: opts.columns,
        // kata kunci dan posisi halaman yang sedang tampil di tabel,
        // supaya "Hasil pencarian" dan "Halaman ini saja" sama persis dengan isi tabel
        search: opts.scope === 'all' ? undefined : search || undefined,
        page: opts.scope === 'page' ? page : undefined,
        per_page: opts.scope === 'page' ? perPage : undefined,
      });

      // sv-SE menghasilkan format YYYY-MM-DD dengan zona waktu lokal
      saveBlob(blob, `cabang-${new Date().toLocaleDateString('sv-SE')}.${opts.format}`);
      setExportOpen(false);
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  // kirim file ke backend; kalau sukses tutup modal dan muat ulang tabel
  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    setImportDetails([]);
    try {
      await cabangService.import(file);
      setImportOpen(false);
      if (page === 1) setReloadKey((k) => k + 1);
      else setPage(1); // setPage sudah memicu muat ulang
    } catch (err) {
      const details = getErrorList(err, 'file');
      // banyak pesan -> tampilkan sebagai daftar, pesan umumnya diambil dari server
      setImportError(details.length > 1 ? 'Import dibatalkan. Perbaiki baris berikut lalu coba lagi.' : getErrorMessage(err));
      setImportDetails(details.length > 1 ? details : []);
    } finally {
      setImporting(false);
    }
  };

  const openDelete = (row: Cabang) => {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await cabangService.remove(deleteTarget.id);
      setDeleteOpen(false);
      // kalau yang dihapus satu-satunya baris di halaman ini, mundur satu halaman
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else setReloadKey((k) => k + 1);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Cabang>[] = [
    { key: 'nama', header: 'Nama', width: 'minmax(0,1fr)', cell: (p) => <span className="truncate font-semibold">{p.nama}</span> },
    { key: 'alamat', header: 'Alamat', width: 'minmax(0,1.4fr)', cell: (p) => <span className="truncate">{p.alamat ?? '-'}</span> },
    {
      key: 'link', header: 'Lokasi', width: '150px',
      cell: (p) => isHttpUrl(p.link) ? (
        <a
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
        >
          <MapIcon size={14} />Lihat Lokasi
        </a>
      ) : (
        <span className="truncate">{p.link ?? '-'}</span>
      ),
    },
    { key: 'telepon', header: 'Telepon', width: '130px', cell: (p) => <span className="truncate">{p.telepon ?? '-'}</span> },
    {
      key: 'aksi', header: 'Aksi', width: '80px', align: 'right',
      cell: (p) => (
        <span className="flex items-center gap-0.5">
          <button type="button" aria-label="Ubah" className={iconBtn} onClick={() => openEdit(p)}><Pencil size={14} /></button>
          <button type="button" aria-label="Hapus" className={`${iconBtn} hover:text-danger`} onClick={() => openDelete(p)}><Trash2 size={14} /></button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Kelola data cabang.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} onClick={() => { setExportError(''); setExportOpen(true); }}><Download size={14} />Export Excel</button>
          <button type="button" className={btnOutline} onClick={() => { setImportError(''); setImportDetails([]); setImportOpen(true); }}><Upload size={14} />Import Excel</button>
          <button type="button" className={btnCreate} onClick={openCreate}>
            <Plus size={14} />Tambah Cabang
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Cari nama, alamat, atau telepon cabang..." />

        <p className="text-[11px] text-ink-muted">
          Total:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}{' '}
          cabang
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(p) => p.id}
          loading={loading}
          emptyText={error || 'Belum ada cabang.'}
          pagination={{ page, pageCount, onPageChange: setPage, perPage, onPerPageChange: handlePerPageChange }}
        />
      </div>

      <CabangFormModal
        open={formOpen}
        cabang={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import cabang"
        description="Unggah file Excel/CSV data cabang."
        requiredColumns={['Nama']}
        onSubmit={handleImport}
        loading={importing}
        error={importError}
        details={importDetails}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export cabang"
        columns={EXPORT_COLUMNS}
        total={total}
        loading={exporting}
        error={exportError}
        onSubmit={handleExport}
      />

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Hapus cabang"
        size="sm"
        footer={
          <>
            <button type="button" className={btnOutline} onClick={() => setDeleteOpen(false)} disabled={deleting}>Batal</button>
            <button type="button" className={btnDanger} onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Hapus
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{deleteTarget?.nama}</span> akan dihapus permanen dan nggak bisa dikembalikan.
        </p>
        {deleteError && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{deleteError}</p>}
      </Modal>
    </div>
  );
}