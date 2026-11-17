import { useEffect, useState } from 'react';
import { Download, Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import SearchField from '../../../components/ui/SearchField';
import Modal from '../../../components/modal/Modal';
import ImportModal from '../../../components/modal/ImportModal';
import ExportModal, { type ExportColumn, type ExportOptions } from '../../../components/modal/ExportModal';
import { btnCreate, btnDanger, btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { supplierService } from '../../../services/supplierService';
import { transferService } from '../../../services/transferService';
import { getErrorList, getErrorMessage } from '../../../lib/errors';
import { saveBlob } from '../../../lib/downloadExport';
import type { Supplier } from '../../../types/supplier';
import SupplierFormModal from './SupplierFormModal';

const PER_PAGE = 10;

// kolom yang bisa dipilih di modal export (nanti harus sama dengan COLUMNS di export backend)
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'nama', label: 'Nama' },
  { key: 'alamat', label: 'Alamat' },
  { key: 'telepon', label: 'Telepon' },
];

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink';

export default function SupplierPage() {
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Supplier[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // naikkan untuk memuat ulang tabel

  // import
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDetails, setImportDetails] = useState<string[]>([]);

  // export
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // modal tambah / ubah (`editing` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  // modal konfirmasi hapus
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    supplierService
      .list(page, PER_PAGE, search)
      .then((res) => {
        if (ignore) return;
        setRows(res.data);
        setPageCount(res.last_page);
        setTotal(res.total);
      })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, search, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: Supplier) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  };

  const openExport = () => {
    setExportError('');
    setExportOpen(true);
  };

  const handleExport = async (opts: ExportOptions) => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await transferService.export('/supplier', {
        format: opts.format,
        scope: opts.scope,
        columns: opts.columns,
        search: opts.scope === 'all' ? undefined : search || undefined,
        page: opts.scope === 'page' ? page : undefined,
        per_page: opts.scope === 'page' ? PER_PAGE : undefined,
      });
      saveBlob(blob, `supplier-${new Date().toLocaleDateString('sv-SE')}.${opts.format}`);
      setExportOpen(false);
    } catch (err) {
      setExportError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const openImport = () => {
    setImportError('');
    setImportDetails([]);
    setImportOpen(true);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError('');
    setImportDetails([]);
    try {
      await transferService.import('/supplier', file);
      setImportOpen(false);
      if (page === 1) setReloadKey((k) => k + 1);
      else setPage(1); // setPage sudah memicu muat ulang
    } catch (err) {
      const details = getErrorList(err, 'file');
      // banyak pesan -> tampilkan sebagai daftar
      setImportError(details.length > 1 ? 'Import dibatalkan. Perbaiki baris berikut lalu coba lagi.' : getErrorMessage(err));
      setImportDetails(details.length > 1 ? details : []);
    } finally {
      setImporting(false);
    }
  };

  const openDelete = (row: Supplier) => {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await supplierService.remove(deleteTarget.id);
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

  const columns: Column<Supplier>[] = [
    { key: 'nama', header: 'Nama', width: 'minmax(0,1fr)', cell: (p) => <span className="truncate font-semibold">{p.nama}</span> },
    { key: 'alamat', header: 'Alamat', width: 'minmax(0,1.4fr)', cell: (p) => <span className="truncate">{p.alamat ?? '-'}</span> },
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
        <p className="text-xs text-ink-soft">Kelola data supplier.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} onClick={openExport}><Download size={14} />Export Excel</button>
          <button type="button" className={btnOutline} onClick={openImport}><Upload size={14} />Import Excel</button>
          <button type="button" className={btnCreate} onClick={openCreate}>
            <Plus size={14} />Tambah Supplier
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Cari nama, alamat, atau telepon supplier..." />

        <p className="text-[11px] text-ink-muted">
          Total:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}{' '}
          supplier
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(p) => p.id}
          loading={loading}
          emptyText={error || 'Belum ada supplier.'}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <SupplierFormModal
        open={formOpen}
        supplier={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import supplier"
        description="Unggah file Excel/CSV data supplier."
        requiredColumns={['Nama']}
        onSubmit={handleImport}
        loading={importing}
        error={importError}
        details={importDetails}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export supplier"
        columns={EXPORT_COLUMNS}
        total={total}
        loading={exporting}
        error={exportError}
        onSubmit={handleExport}
      />

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Hapus supplier"
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