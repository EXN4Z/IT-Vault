import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeDollarSign, Boxes, CircleCheck, Clock, Eye, HandHelping, Link2, Loader2, OctagonAlert, Pencil, Plus, Printer, RotateCcw, Tag, Trash2, Unlink, UserCheck, Wrench,
} from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import SearchField from '../../../components/ui/SearchField';
import SegmentedTabs from '../../../components/ui/SegmentedTabs';
import Modal from '../../../components/modal/Modal';
import { btnDanger, btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { inventoryService } from '../../../services/inventoryService';
import { peminjamanService } from '../../../services/peminjamanService';
import { getErrorMessage } from '../../../lib/errors';
import { openReceiptWindow, writeReceipt } from '../../../lib/receipt';
import { INVENTORY_STATUSES, type InventoryRow } from '../../../types/inventory';
import InventoryDetailModal from './InventoryDetailModal';
import InventoryFormModal from './InventoryFormModal';
import InventoryHandoverModal from './InventoryHandOverModal';
import InventoryJualModal from './InventoryJualModal';
import InventoryLinkModal from './InventoryLinkModal';
import InventoryReturnModal from './InventoryReturnModal';
import PenangananLaporModal from './PenangananLaporModal';

const PER_PAGE = 10;

// tab berdasarkan status; 'semua' = tanpa filter
const TABS = [
  { key: 'semua', label: 'Semua Status', icon: Boxes },
  { key: 'tersedia', label: 'Tersedia', icon: CircleCheck },
  { key: 'dipinjam', label: 'Dipinjam', icon: UserCheck },
  { key: 'menunggu_perbaikan', label: 'Menunggu Perbaikan', icon: Clock },
  { key: 'diperbaiki', label: 'Sedang Diperbaiki', icon: Wrench },
  { key: 'rusak_berat', label: 'Rusak Berat', icon: OctagonAlert },
  { key: 'dijual', label: 'Dijual', icon: BadgeDollarSign },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted';

export default function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // naikkan untuk memuat ulang tabel

  // modal tambah / ubah (`editing` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRow | null>(null);

  // modal link / lepas link (satu modal, mode ditentukan dari inventory-nya; `linkTarget` juga tidak di-null-kan saat tutup, alasannya sama)
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<InventoryRow | null>(null);

  // modal serahkan ke karyawan (`handoverTarget` juga tidak di-null-kan saat tutup, alasannya sama)
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<InventoryRow | null>(null);

  // modal kembalikan dan modal detail (target tidak di-null-kan saat tutup, alasannya sama)
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<InventoryRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<InventoryRow | null>(null);

  // modal lapor kerusakan (target tidak di-null-kan saat tutup, alasannya sama)
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<InventoryRow | null>(null);

  // modal jual inventory (target tidak di-null-kan saat tutup, alasannya sama)
  const [jualOpen, setJualOpen] = useState(false);
  const [jualTarget, setJualTarget] = useState<InventoryRow | null>(null);

  // cetak ulang struk: id barang yang sedang diproses (untuk menonaktifkan tombolnya) dan pesan gagalnya
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [printError, setPrintError] = useState('');

  // modal konfirmasi hapus
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // status diambil dari URL (?status=tersedia), default 'semua'
  const statusParam = params.get('status');
  const tab: TabKey = TABS.some((t) => t.key === statusParam) ? (statusParam as TabKey) : 'semua';

  const changeTab = (key: TabKey) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev); // tab=inventory ikut kebawa
      next.set('status', key);
      return next;
    }, { replace: true });
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

  // ambil data saat halaman / tab / pencarian berganti atau tabel perlu dimuat ulang
  useEffect(() => {
    let ignore = false; // kalau request lama selesai belakangan, hasilnya dibuang
    setLoading(true);
    setError('');
    setRows([]);
    setTotal(0);
    inventoryService
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

  const openEdit = (row: InventoryRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  };

  const openLink = (row: InventoryRow) => {
    setLinkTarget(row);
    setLinkOpen(true);
  };

  const handleLinkDone = () => {
    setLinkOpen(false);
    setReloadKey((k) => k + 1);
  };

  const openHandover = (row: InventoryRow) => {
    setHandoverTarget(row);
    setHandoverOpen(true);
  };

  const openReturn = (row: InventoryRow) => {
    setReturnTarget(row);
    setReturnOpen(true);
  };

  const openReport = (row: InventoryRow) => {
    setReportTarget(row);
    setReportOpen(true);
  };

  const openJual = (row: InventoryRow) => {
    setJualTarget(row);
    setJualOpen(true);
  };

  const openDetail = (row: InventoryRow) => {
    setDetailTarget(row);
    setDetailOpen(true);
  };

  // cetak ulang struk barang utama yang sedang dipinjam
  const reprintReceipt = async (row: InventoryRow) => {
    if (printingId !== null) return;
    setPrintError('');
    setPrintingId(row.id);
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const receipt = await peminjamanService.struk(row.id);
      if (win) writeReceipt(win, receipt);
      else setPrintError('Jendela struk diblokir browser. Izinkan popup untuk halaman ini, lalu klik cetak ulang lagi.');
    } catch (err) {
      win?.close();
      setPrintError(getErrorMessage(err));
    } finally {
      setPrintingId(null);
    }
  };

  const openDelete = (row: InventoryRow) => {
    setDeleteTarget(row);
    setDeleteError('');
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await inventoryService.remove(deleteTarget.id);
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

  const columns: Column<InventoryRow>[] = [
    { key: 'kode', header: 'Kode', width: '120px', cell: (i) => <span className="truncate font-semibold">{i.kode_inventory}</span> },
    { key: 'nama', header: 'Nama', width: 'minmax(0,1.3fr)', cell: (i) => <span className="truncate font-semibold">{i.nama ?? '-'}</span> },
    { key: 'kategori', header: 'Kategori', width: 'minmax(0,1fr)', cell: (i) => <span className="truncate">{i.kategori?.nama ?? '-'}</span> },
    {
      key: 'merk', header: 'Merk', width: 'minmax(0,1fr)',
      cell: (i) => <span className="truncate">{[i.merk, i.type].filter(Boolean).join(' ') || '-'}</span>,
    },
    { key: 'jumlah', header: 'Jumlah', width: '60px', align: 'center', cell: (i) => <span>{i.jumlah}</span> },
    {
      key: 'link', header: 'Link', width: 'minmax(0,1fr)',
      cell: (i) => {
        if (i.parent) return <span className="truncate text-ink-soft">{i.parent.kode_inventory}</span>;
        if ((i.children_count ?? 0) > 0) return <span className="truncate text-ink-soft">{i.children_count} Kelengkapan</span>;
        return <span className="text-ink-muted">-</span>;
      },
    },
    {
      key: 'peminjam', header: 'Peminjam', width: 'minmax(0,1fr)',
      cell: (i) => <span className="truncate">{i.peminjam?.name ?? '-'}</span>,
    },
    {
      key: 'status', header: 'Status', width: '170px', align: 'center',
      cell: (i) => {
        const s = INVENTORY_STATUSES.find((x) => x.key === i.status);
        return <Badge dot={s?.dot ?? 'bg-ink-muted'}>{s?.label ?? i.status}</Badge>;
      },
    },
    {
      key: 'aksi', header: 'Aksi', width: '244px', align: 'right',
      cell: (i) => (
        <span className="flex items-center gap-0.5">
          {i.parent_id !== null ? (
            // sudah jadi kelengkapan: harus dilepas dulu sebelum bisa link ke inventory lain
            <button
              type="button"
              aria-label="Lepas link"
              title={i.status === 'dijual' ? 'Inventory yang sudah dijual terkunci' : `Lepas link dari ${i.parent?.kode_inventory ?? 'barang utama'}`}
              className={iconBtn}
              disabled={i.status === 'dijual'}
              onClick={() => openLink(i)}
            ><Unlink size={14} /></button>
          ) : (
            // sudah jadi barang utama: tidak boleh link ke inventory lain
            <button
              type="button"
              aria-label="Link ke barang utama"
              title={
                i.status === 'dijual' ? 'Inventory yang sudah dijual terkunci'
                  : (i.children_count ?? 0) > 0 ? 'Sudah jadi barang utama, tidak bisa di-link ke inventory lain'
                    : 'Link ke barang utama'
              }
              className={iconBtn}
              disabled={i.status === 'dijual' || (i.children_count ?? 0) > 0}
              onClick={() => openLink(i)}
            ><Link2 size={14} /></button>
          )}
          <button
            type="button"
            aria-label="Serahkan ke karyawan"
            title={
              i.parent_id !== null ? 'Kelengkapan ikut diserahkan bersama barang utamanya'
                : i.status !== 'tersedia' ? 'Hanya inventory berstatus Tersedia yang bisa diserahkan'
                  : 'Serahkan ke karyawan'
            }
            className={iconBtn}
            disabled={i.parent_id !== null || i.status !== 'tersedia'}
            onClick={() => openHandover(i)}
          ><HandHelping size={14} /></button>
          {/* barang utama yang sedang dipinjam: struk dicetak ulang dengan nomor yang sama, kelengkapan sesuai kondisi terbaru */}
          {i.status === 'dipinjam' && i.parent_id === null && (
            <button
              type="button"
              aria-label="Cetak ulang struk"
              title="Cetak ulang struk"
              className={iconBtn}
              disabled={printingId !== null}
              onClick={() => reprintReceipt(i)}
            >
              {printingId === i.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            </button>
          )}
          {/* barang utama yang sedang dipinjam: kembalikan (butuh nomor penerimaan dari struk serah terima) */}
          {i.status === 'dipinjam' && i.parent_id === null && (
            <button type="button" aria-label="Kembalikan" title="Kembalikan" className={iconBtn} onClick={() => openReturn(i)}><RotateCcw size={14} /></button>
          )}
          {/* tersedia maupun dipinjam boleh dilaporkan; status lain sudah dilaporkan / diperbaiki / rusak berat / dijual */}
          <button
            type="button"
            aria-label="Lapor kerusakan"
            title={i.status === 'tersedia' || i.status === 'dipinjam' ? 'Lapor kerusakan' : 'Hanya inventory berstatus Tersedia atau Dipinjam yang bisa dilaporkan'}
            className={`${iconBtn} hover:text-warn`}
            disabled={i.status !== 'tersedia' && i.status !== 'dipinjam'}
            onClick={() => openReport(i)}
          ><Wrench size={14} /></button>
          {/* hanya Rusak Berat yang bisa dijual, dan kelengkapan yang masih nempel harus dilepas dulu */}
          {i.status === 'rusak_berat' && (
            <button
              type="button"
              aria-label="Jual inventory"
              title={
                i.parent_id !== null ? 'Masih jadi kelengkapan, lepas link dulu sebelum dijual'
                  : (i.children_count ?? 0) > 0 ? 'Masih ada kelengkapan yang terpasang, lepas link semuanya dulu sebelum dijual'
                    : 'Jual inventory'
              }
              className={iconBtn}
              disabled={i.parent_id !== null || (i.children_count ?? 0) > 0}
              onClick={() => openJual(i)}
            ><Tag size={14} /></button>
          )}
          <button type="button" aria-label="Detail" title="Detail" className={iconBtn} onClick={() => openDetail(i)}><Eye size={14} /></button>
          <button type="button" aria-label="Ubah" title={i.status === 'dijual' ? 'Inventory yang sudah dijual terkunci' : 'Ubah'} className={iconBtn} disabled={i.status === 'dijual'} onClick={() => openEdit(i)}><Pencil size={14} /></button>
          <button type="button" aria-label="Hapus" title={i.status === 'dijual' ? 'Inventory yang sudah dijual terkunci' : 'Hapus'} className={`${iconBtn} hover:text-danger`} disabled={i.status === 'dijual'} onClick={() => openDelete(i)}><Trash2 size={14} /></button>
        </span>
      ),
    },
  ];

  const label = TABS.find((t) => t.key === tab)!.label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">Kelola data inventory perangkat IT dan statusnya.</p>
        <button type="button" className={btnSolid} onClick={openCreate}>
          <Plus size={14} />Tambah Inventory
        </button>
      </div>

      <div className="space-y-3">
        {printError && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{printError}</p>}
        <SegmentedTabs tabs={TABS} value={tab} onChange={changeTab} />
        <SearchField value={query} onChange={setQuery} placeholder="Cari kode, nama, merk, type, atau serial number..." />

        {/* counter data */}
        <p className="text-[11px] text-ink-muted">
          Total {label}:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}{' '}
          inventory
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(i) => i.id}
          loading={loading}
          emptyText={error || 'Belum ada inventory.'}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <InventoryFormModal
        open={formOpen}
        inventory={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <InventoryLinkModal
        open={linkOpen}
        inventory={linkTarget}
        onClose={() => setLinkOpen(false)}
        onDone={handleLinkDone}
      />

      <InventoryHandoverModal
        open={handoverOpen}
        inventory={handoverTarget}
        onClose={() => setHandoverOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <InventoryReturnModal
        open={returnOpen}
        inventory={returnTarget}
        onClose={() => setReturnOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      {/* tombol aksi di dalam detail menutup detail dulu, baru membuka modal aksinya */}
      <InventoryDetailModal
        open={detailOpen}
        inventory={detailTarget}
        onClose={() => setDetailOpen(false)}
        onHandover={openHandover}
        onReturn={openReturn}
        onLink={openLink}
        onReport={openReport}
        onSell={openJual}
      />

      <InventoryJualModal
        open={jualOpen}
        inventory={jualTarget}
        onClose={() => setJualOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <PenangananLaporModal
        open={reportOpen}
        inventory={reportTarget}
        onClose={() => setReportOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) setDeleteOpen(false); }}
        title="Hapus inventory"
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
          <span className="font-semibold text-ink">{deleteTarget?.kode_inventory}</span>
          {deleteTarget?.nama ? ` (${deleteTarget.nama})` : ''} akan dihapus permanen dan nggak bisa dikembalikan.
        </p>
        {deleteError && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{deleteError}</p>}
      </Modal>
    </div>
  );
}