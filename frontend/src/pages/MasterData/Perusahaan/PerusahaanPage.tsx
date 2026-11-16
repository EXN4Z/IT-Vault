import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import SearchField from '../../../components/ui/SearchField';
import Modal from '../../../components/modal/Modal';
import { btnDanger, btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { perusahaanService } from '../../../services/perusahaanService';
import { getErrorMessage } from '../../../lib/errors';
import type { Perusahaan } from '../../../types/perusahaan';
import PerusahaanFormModal from './PerusahaanFormModal';

const PER_PAGE = 10;

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink';

export default function PerusahaanPage() {
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Perusahaan[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // naikkan untuk memuat ulang tabel

  // modal tambah / ubah (`editing` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Perusahaan | null>(null);

  // modal konfirmasi hapus
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Perusahaan | null>(null);
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
    perusahaanService
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

  const openEdit = (row: Perusahaan) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  };

  const openDelete = (row: Perusahaan) => {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await perusahaanService.remove(deleteTarget.id);
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

  const columns: Column<Perusahaan>[] = [
    { key: 'nama', header: 'Nama', width: 'minmax(0,1fr)', cell: (p) => <span className="truncate font-semibold">{p.nama}</span> },
    { key: 'alamat', header: 'Alamat', width: 'minmax(0,1.4fr)', cell: (p) => <span className="truncate">{p.alamat ?? '-'}</span> },
    { key: 'link', header: 'Link', width: 'minmax(0,1fr)', cell: (p) => <span className="truncate">{p.link ?? '-'}</span> },
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
        <p className="text-xs text-ink-soft">Kelola data perusahaan.</p>
        <button type="button" className={btnSolid} onClick={openCreate}>
          <Plus size={14} />Tambah Perusahaan
        </button>
      </div>

      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Cari nama, alamat, atau telepon perusahaan..." />

        <p className="text-[11px] text-ink-muted">
          Total:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}{' '}
          perusahaan
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(p) => p.id}
          loading={loading}
          emptyText={error || 'Belum ada perusahaan.'}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <PerusahaanFormModal
        open={formOpen}
        perusahaan={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Hapus perusahaan"
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