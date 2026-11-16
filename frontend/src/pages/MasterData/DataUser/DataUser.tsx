import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Eye, Loader2, Pencil, Plus, ShieldCheck, Trash2, Upload, User as UserIcon, Users } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import SearchField from '../../../components/ui/SearchField';
import SegmentedTabs from '../../../components/ui/SegmentedTabs';
import Modal from '../../../components/modal/Modal';
import { btnDanger, btnOutline } from '../../../components/ui/buttonStyles';
import { userService, type UserImportResult } from '../../../services/userService';
import { getErrorMessage } from '../../../lib/errors';
import type { UserRow } from '../../../types/user';
import DataUserFormModal from './DataUserFormModal';
import ImportModal from '../../../components/modal/ImportModal';


const PER_PAGE = 10;

const TABS = [
  { key: 'semua', label: 'Semua', icon: Users },
  { key: 'user', label: 'User', icon: UserIcon },
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink';

export default function UsersPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
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
  const [importResult, setImportResult] = useState<UserImportResult | null>(null);

  // modal tambah / ubah (`editing` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  // modal konfirmasi hapus
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // role diambil dari URL (?role=user), default 'all'
  const roleParam = params.get('role');
  const tab: TabKey = TABS.some((t) => t.key === roleParam) ? (roleParam as TabKey) : 'semua';

  const changeTab = (key: TabKey) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev); // tab=data-user ikut kebawa
      next.set('role', key);
      return next;
    }, { replace: true });
    setPage(1);
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
      const res = await userService.import(file);
      setImportOpen(false);
      setImportResult(res); // ringkasan tampil di halaman
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setImportError(getErrorMessage(err));
      // 422 dari controller membawa daftar alasan (array string)
      const errors = (err as { response?: { data?: { errors?: unknown } } }).response?.data?.errors;
      setImportDetails(Array.isArray(errors) ? errors.map(String) : []);
    } finally {
      setImporting(false);
    }
  };

  // tunda pencarian 300ms setelah berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ambil data saat halaman / tab / pencarian berganti atau tabel perlu dimuat ulang
  useEffect(() => {
    let ignore = false; // kalau request lama selesai belakangan, hasilnya dibuang
    setLoading(true);
    setError('');
    setRows([]);
    setTotal(0);
    userService
      .list(page, PER_PAGE, tab === 'semua' ? undefined : tab, search)
      .then((res) => {
        if (ignore) return;
        setRows(res.data);
        setPageCount(res.last_page);
        setTotal(res.total);
      })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, tab, search, reloadKey]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  };

  const openDelete = (row: UserRow) => {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await userService.remove(deleteTarget.id);
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

  const columns: Column<UserRow>[] = [
    { key: 'nik', header: 'NIK', width: '120px', cell: (u) => <span className="truncate font-semibold">{u.nik ?? '-'}</span> },
    { key: 'nama', header: 'Nama', cell: (u) => <span className="truncate font-semibold">{u.name}</span> },
    { key: 'email', header: 'Email', width: 'minmax(0,1.3fr)', cell: (u) => <span className="truncate">{u.email}</span> },
    {
      key: 'role', header: 'Role', width: '90px', align: 'center',
      cell: (u) => (
        <Badge dot={u.role?.nama.toLowerCase() === 'admin' ? 'bg-warn' : 'bg-info'}>{u.role?.nama ?? '-'}</Badge>
      ),
    },
    {
      key: 'status', header: 'Status', width: '90px', align: 'center',
      cell: (u) => {
        const aktif = u.status === 'aktif';
        return <Badge dot={aktif ? 'bg-success' : 'bg-ink-muted'}>{aktif ? 'Aktif' : 'Nonaktif'}</Badge>;
      },
    },
    {
      key: 'aksi', header: 'Aksi', width: '104px', align: 'right',
      cell: (u) => (
        <span className="flex items-center gap-0.5">
          <button type="button" aria-label="Lihat" className={iconBtn}><Eye size={14} /></button>
          <button type="button" aria-label="Ubah" className={iconBtn} onClick={() => openEdit(u)}><Pencil size={14} /></button>
          <button type="button" aria-label="Hapus" className={`${iconBtn} hover:text-danger`} onClick={() => openDelete(u)}><Trash2 size={14} /></button>
        </span>
      ),
    },
  ];

  const label = TABS.find((t) => t.key === tab)!.label;

  const outline = 'flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold transition hover:bg-hover';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Kelola data user dan karyawan sistem, akun login, departemen, dan hak akses.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={outline}><Download size={14} />Export Excel</button>
          <button type="button" className={outline} onClick={openImport}><Upload size={14} />Import Excel</button>
          <button
            type="button"
            onClick={openCreate}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-surface transition hover:opacity-90"
          >
            <Plus size={14} />Tambah User
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {importResult && (
          <div className="rounded-lg bg-selected px-3 py-2 text-xs">
            <div className="flex items-start justify-between gap-3">
              <p>
                Import selesai:{' '}
                <span className="font-semibold">{importResult.ditambahkan}</span> user ditambahkan,{' '}
                {importResult.diperbarui} diperbarui
                {importResult.jumlah_error > 0 && `, ${importResult.jumlah_error} baris gagal`}.
              </p>
              <button
                type="button"
                aria-label="Tutup"
                className="cursor-pointer text-ink-muted hover:text-ink"
                onClick={() => setImportResult(null)}
              >×</button>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-1.5 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-ink-soft">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <SegmentedTabs tabs={TABS} value={tab} onChange={changeTab} />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Cari nama, email, atau NIK user..."
        />

        {/* counter data */}
        <p className="text-[11px] text-ink-muted">
          Total {label}:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}{' '}
          user
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(u) => u.id}
          loading={loading}
          emptyText={error || 'Belum ada user.'}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <DataUserFormModal
        open={formOpen}
        user={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import user"
        description="Unggah file Excel/CSV data user. User yang NIK atau emailnya sudah ada akan diperbarui."
        requiredColumns={['Nama', 'Email']}
        onSubmit={handleImport}
        loading={importing}
        error={importError}
        details={importDetails}
      />

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Hapus user"
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
          <span className="font-semibold text-ink">{deleteTarget?.name}</span> akan dihapus permanen dan nggak bisa dikembalikan.
        </p>
        {deleteError && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{deleteError}</p>}
      </Modal>
    </div>
  );
}