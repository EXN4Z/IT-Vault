import { useEffect, useState } from 'react';
import { LayoutGrid, List, Loader2, Package, Printer, Undo2, Wrench } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import DataTable, { type Column } from '../../components/ui/DataTable';
import SearchField from '../../components/ui/SearchField';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import { btnOutline, btnSolid } from '../../components/ui/buttonStyles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { openReceiptWindow, writeReceipt } from '../../lib/receipt';
import { formatTanggal } from '../../lib/waktu';
import { myInventoryService } from '../../services/myInventoryService';
import { peminjamanService } from '../../services/peminjamanService';
import { INVENTORY_STATUSES } from '../../types/inventory';
import type { MyInventory, MyInventoryItem, MyPenanganan } from '../../types/myInventory';
import PenangananLaporModal from '../MasterData/Inventory/PenangananLaporModal';
import NotificationPanel from './NotificationPanel';
import UserReturnModal from './UserReturnModal';

const VIEWS = [
  { key: 'kartu', label: 'Kartu', icon: LayoutGrid },
  { key: 'tabel', label: 'Tabel', icon: List },
] as const;
type ViewKey = (typeof VIEWS)[number]['key'];

// tombol ikon kecil (sama dengan halaman Inventory)
const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60';

// selisih hari kalender antara 'YYYY-MM-DD' dan hari ini
function hariSejak(tanggal: string): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((hariIni.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
}

function StatusBadge({ status }: { status: MyInventoryItem['status'] }) {
  const st = INVENTORY_STATUSES.find((s) => s.key === status);
  return st ? <Badge dot={st.dot}>{st.label}</Badge> : null;
}

// satu unit di tabel: barang utama atau kelengkapannya (`induk` = barang utama yang memuatnya)
interface Unit {
  item: MyInventoryItem;
  induk: MyInventory;
  utama: boolean;
}

interface LaporanAktif extends MyPenanganan {
  kode: string;
  nama: string;
}

// tiga tahap laporan kerusakan; `aktif` = tahap yang sedang berjalan (0 = dilaporkan, 1 = diproses)
function Tahap({ aktif }: { aktif: number }) {
  const steps = ['Dilaporkan', 'Diproses', 'Selesai'];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={s} className="flex w-16 flex-col gap-1">
          <span className={`h-1 rounded-full ${i <= aktif ? 'bg-accent' : 'bg-selected'}`} />
          <span className={`text-[10px] ${i <= aktif ? 'font-medium text-ink' : 'text-ink-muted'}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

// satu kolom spesifikasi kecil di kartu (label di atas, nilai di bawah)
function Spec({ name, value }: { name: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-ink-muted">{name}</p>
      <p className="truncate text-xs font-medium">{value || '-'}</p>
    </div>
  );
}

// dashboard user: ringkasan ringkas, daftar barang dalam dua tampilan (kartu / tabel), dan laporan kerusakan berjalan
export default function UserDashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MyInventory[]>();
  const [view, setView] = useState<ViewKey>('kartu');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [printing, setPrinting] = useState<number | null>(null);

  const [reportTarget, setReportTarget] = useState<MyInventoryItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<MyInventory | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);

  useEffect(() => {
    let batal = false;
    myInventoryService
      .list()
      .then((d) => {
        if (!batal) {
          setItems(d);
          setError('');
        }
      })
      .catch((e) => {
        if (!batal) setError(getErrorMessage(e));
      });
    return () => {
      batal = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const openReport = (item: MyInventoryItem) => {
    setReportTarget(item);
    setReportOpen(true);
  };

  const openReturn = (item: MyInventory) => {
    setReturnTarget(item);
    setReturnOpen(true);
  };

  // cetak ulang struk serah terima (jendela dibuka dulu di dalam klik supaya tidak diblokir browser)
  const printStruk = async (item: MyInventory) => {
    if (printing) return;
    setPrinting(item.id);
    const win = openReceiptWindow();
    try {
      const receipt = await peminjamanService.struk(item.id);
      if (win) writeReceipt(win, receipt);
      else setError('Jendela struk diblokir browser. Izinkan popup untuk halaman ini, lalu coba lagi.');
    } catch (e) {
      win?.close();
      setError(getErrorMessage(e));
    } finally {
      setPrinting(null);
    }
  };

  // ===== turunan data =====
  const units: Unit[] = (items ?? []).flatMap((i) => [
    { item: i as MyInventoryItem, induk: i, utama: true },
    ...i.kelengkapan.map((k) => ({ item: k, induk: i, utama: false })),
  ]);
  const laporan: LaporanAktif[] = units.flatMap(({ item: b }) =>
    b.penanganan ? [{ ...b.penanganan, kode: b.kode_inventory, nama: b.nama || b.merk || b.kode_inventory }] : [],
  );
  const bermasalah = units.filter(({ item }) => item.status !== 'dipakai' && item.status !== 'tersedia').length;
  const terlama = Math.max(0, ...(items ?? []).map((i) => (i.tanggal_penerimaan ? hariSejak(i.tanggal_penerimaan) : 0)));

  const q = query.trim().toLowerCase();
  const filtered = q
    ? units.filter(({ item }) =>
        [item.kode_inventory, item.nama, item.merk, item.type, item.serial_number].some((v) => v?.toLowerCase().includes(q)),
      )
    : units;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const stats = [
    { label: 'Barang utama', value: String(items?.length ?? 0) },
    { label: 'Total unit', value: String(units.length) },
    { label: 'Perlu perhatian', value: String(bermasalah) },
    { label: 'Pemakaian terlama', value: `${terlama} hari` },
  ];

  // ===== kolom tabel =====
  const columns: Column<Unit>[] = [
    { key: 'kode', header: 'Kode', width: '110px', cell: ({ item }) => <span className="truncate font-semibold">{item.kode_inventory}</span> },
    {
      key: 'barang', header: 'Barang', width: 'minmax(0,1.3fr)',
      cell: ({ item }) => (
        <span className="min-w-0">
          <span className="block truncate font-medium">{item.nama || item.merk || '-'}</span>
          <span className="block truncate text-[11px] text-ink-muted">{[item.merk, item.type, item.warna].filter(Boolean).join(' · ') || '-'}</span>
        </span>
      ),
    },
    {
      key: 'jenis', header: 'Jenis', width: 'minmax(0,1fr)',
      cell: ({ utama, induk }) =>
        utama ? <span>Barang utama</span> : <span className="truncate text-ink-soft">Kelengkapan {induk.kode_inventory}</span>,
    },
    { key: 'serial', header: 'Serial number', width: 'minmax(0,1fr)', cell: ({ item }) => <span className="truncate">{item.serial_number ?? '-'}</span> },
    { key: 'status', header: 'Status', width: '140px', cell: ({ item }) => <StatusBadge status={item.status} /> },
    {
      key: 'sejak', header: 'Dipakai sejak', width: '100px',
      cell: ({ induk }) => <span>{induk.tanggal_penerimaan ? formatTanggal(induk.tanggal_penerimaan) : '-'}</span>,
    },
    {
      key: 'aksi', header: 'Aksi', width: '84px', align: 'right',
      cell: ({ item, induk, utama }) => (
        <span className="flex items-center gap-0.5">
          {item.bisa_dilapor && (
            <button type="button" title="Lapor kerusakan" aria-label={`Lapor kerusakan ${item.kode_inventory}`} className={iconBtn} onClick={() => openReport(item)}>
              <Wrench size={14} />
            </button>
          )}
          {utama && induk.bisa_dikembalikan && (
            <button type="button" title="Kembalikan" aria-label={`Kembalikan ${item.kode_inventory}`} className={iconBtn} onClick={() => openReturn(induk)}>
              <Undo2 size={14} />
            </button>
          )}
          {utama && induk.bisa_dikembalikan && (
            <button type="button" title="Cetak struk" aria-label={`Cetak struk ${item.kode_inventory}`} className={iconBtn} disabled={printing === induk.id} onClick={() => printStruk(induk)}>
              {printing === induk.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="min-w-0 space-y-4">
      {/* ===== judul + pilihan tampilan ===== */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Inventory saya</h1>
          <p className="mt-0.5 truncate text-xs text-ink-muted">Halo, {user?.name}</p>
        </div>
        {items && items.length > 0 && <SegmentedTabs tabs={VIEWS} value={view} onChange={setView} />}
      </div>

      {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

      {/* grid-cols-1 = minmax(0,1fr): kolom tidak bisa melebar melebihi layar di mobile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* ===== kolom kiri ===== */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {!items && !error && (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink-muted">
              <Loader2 size={14} className="animate-spin" />
              Memuat...
            </div>
          )}

          {items && items.length === 0 && (
            <section className="rounded-xl border border-line bg-surface py-12 text-center">
              <Package size={22} className="mx-auto text-ink-muted" />
              <p className="mt-3 text-sm font-medium">Belum ada inventory</p>
              <p className="mt-1 text-xs text-ink-muted">Barang yang diserahkan tim IT ke kamu akan tampil di sini.</p>
            </section>
          )}

          {items && items.length > 0 && (
            <>
              {/* ===== ringkasan: satu strip tipis ===== */}
              <section className="grid grid-cols-2 divide-line rounded-xl border border-line bg-surface md:grid-cols-4 md:divide-x">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-2 px-4 py-2.5 md:flex-col md:items-start md:gap-0">
                    <p className="text-[11px] text-ink-muted">{s.label}</p>
                    <p className="text-lg font-semibold tabular-nums leading-tight">{s.value}</p>
                  </div>
                ))}
              </section>

              {/* ===== tampilan kartu ===== */}
              {view === 'kartu' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <article key={item.id} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface">
                      {/* kepala: nama, kode, status */}
                      <header className="flex items-start gap-3 p-4 pb-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-hover text-ink-muted">
                          <Package size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.nama || item.merk || item.kode_inventory}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {item.kode_inventory}
                            {item.kategori ? ` · ${item.kategori}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </header>

                      {/* spesifikasi */}
                      <div className="grid grid-cols-2 gap-3 px-4 pb-3 sm:grid-cols-4">
                        <Spec name="Merk" value={item.merk} />
                        <Spec name="Tipe" value={item.type} />
                        <Spec name="Warna" value={item.warna} />
                        <Spec name="Serial" value={item.serial_number} />
                      </div>

                      {/* info pemakaian */}
                      <div className="flex items-center justify-between gap-2 border-y border-line bg-hover/40 px-4 py-2 text-[11px] text-ink-muted">
                        <span className="truncate">
                          Dipakai sejak{' '}
                          <span className="font-medium text-ink">{item.tanggal_penerimaan ? formatTanggal(item.tanggal_penerimaan) : '-'}</span>
                          {item.tanggal_penerimaan && ` (${hariSejak(item.tanggal_penerimaan)} hari)`}
                        </span>
                        <span className="shrink-0 truncate">{item.nomor_penerimaan}</span>
                      </div>

                      {/* kelengkapan */}
                      <div className="flex-1 px-4 py-3">
                        <p className="mb-1.5 text-[11px] font-medium text-ink-muted">Kelengkapan ({item.kelengkapan.length})</p>
                        {item.kelengkapan.length === 0 ? (
                          <p className="py-2 text-xs text-ink-muted">Tidak ada kelengkapan terpasang.</p>
                        ) : (
                          <ul className="divide-y divide-line/60">
                            {item.kelengkapan.map((k) => (
                              <li key={k.id} className="flex items-center gap-2 py-1.5">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{k.nama || k.merk || k.kode_inventory}</p>
                                  <p className="truncate text-[11px] text-ink-muted">{k.kode_inventory}</p>
                                </div>
                                <StatusBadge status={k.status} />
                                {k.bisa_dilapor ? (
                                  <button type="button" title="Lapor kerusakan" aria-label={`Lapor kerusakan ${k.kode_inventory}`} className={iconBtn} onClick={() => openReport(k)}>
                                    <Wrench size={14} />
                                  </button>
                                ) : (
                                  <span className="size-[28px]" />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* aksi (flex-wrap: tombol turun ke baris baru kalau layar sempit) */}
                      <footer className="flex flex-wrap items-center gap-2 border-t border-line p-3">
                        {item.bisa_dikembalikan && (
                          <button type="button" className={btnSolid} onClick={() => openReturn(item)}>
                            <Undo2 size={14} />
                            Kembalikan
                          </button>
                        )}
                        {item.bisa_dilapor && (
                          <button type="button" className={btnOutline} onClick={() => openReport(item)}>
                            <Wrench size={14} />
                            Lapor kerusakan
                          </button>
                        )}
                        {/* server hanya mengizinkan cetak ulang struk untuk barang yang sedang dipakai */}
                        {item.bisa_dikembalikan && (
                          <button
                            type="button"
                            title="Cetak struk"
                            aria-label="Cetak struk"
                            className={`${btnOutline} ml-auto w-8 px-0`}
                            disabled={printing === item.id}
                            onClick={() => printStruk(item)}
                          >
                            {printing === item.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                          </button>
                        )}
                      </footer>
                    </article>
                  ))}
                </div>
              )}

              {/* ===== tampilan tabel ===== */}
              {view === 'tabel' && (
                <div className="min-w-0 space-y-3">
                  <SearchField
                    value={query}
                    onChange={(v) => {
                      setQuery(v);
                      setPage(1);
                    }}
                    placeholder="Cari kode, nama, merk, serial number..."
                  />
                  <p className="text-[11px] text-ink-muted">
                    Total: <span className="font-semibold text-ink">{filtered.length.toLocaleString('id-ID')}</span> unit
                  </p>
                  <DataTable
                    columns={columns}
                    data={rows}
                    rowKey={({ item }) => item.id}
                    minWidth={1100}
                    emptyText="Tidak ada barang yang cocok."
                    pagination={{
                      page: currentPage,
                      pageCount,
                      onPageChange: setPage,
                      perPage,
                      onPerPageChange: (n) => {
                        setPerPage(n);
                        setPage(1);
                      },
                      perPageOptions: [5, 10, 25, 50],
                    }}
                  />
                </div>
              )}

              {/* ===== laporan kerusakan berjalan (hanya muncul kalau ada) ===== */}
              {laporan.length > 0 && (
                <section className="rounded-xl border border-line bg-surface">
                  <h2 className="px-4 pb-2 pt-3.5 text-sm font-semibold">Laporan kerusakan berjalan</h2>
                  <ul className="divide-y divide-line/60 border-t border-line">
                    {laporan.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.nama}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {l.kode} · {l.jenis_label} · dilapor {formatTanggal(l.tanggal_lapor)} ({hariSejak(l.tanggal_lapor)} hari lalu)
                          </p>
                        </div>
                        <Tahap aktif={l.status === 'dilaporkan' ? 0 : 1} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {/* ===== kolom kanan: notifikasi, kondisi unit ===== */}
        <aside className="min-w-0 space-y-4">
          <NotificationPanel />

          {items && items.length > 0 && (
            <section className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Kondisi unit</h2>
                <span className="text-xs text-ink-muted">{units.length} unit</span>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-selected">
                {INVENTORY_STATUSES.map((s) => {
                  const n = units.filter(({ item }) => item.status === s.key).length;
                  return n > 0 ? <span key={s.key} className={s.dot} style={{ width: `${(n / units.length) * 100}%` }} /> : null;
                })}
              </div>
              <ul className="mt-3 space-y-1.5">
                {INVENTORY_STATUSES.map((s) => {
                  const n = units.filter(({ item }) => item.status === s.key).length;
                  return n > 0 ? (
                    <li key={s.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <span className={`size-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <span className="font-medium tabular-nums">{n}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <PenangananLaporModal open={reportOpen} inventory={reportTarget} onClose={() => setReportOpen(false)} onSaved={reload} />
      <UserReturnModal open={returnOpen} inventory={returnTarget} onClose={() => setReturnOpen(false)} onSaved={reload} />
    </div>
  );
}