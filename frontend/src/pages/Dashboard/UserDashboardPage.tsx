import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Loader2, Package, Printer, Undo2, Wrench } from 'lucide-react';
import ImageZoomModal from '../../components/modal/ImageZoomModal';
import Badge from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/DataTable';
import { btnOutline, btnSolid } from '../../components/ui/buttonStyles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { openReceiptWindow, writeReceipt } from '../../lib/receipt';
import { formatLama, lamaLalu, lamaSejak, tglJam, tglJamSama } from '../../lib/waktu';
import { myInventoryService } from '../../services/myInventoryService';
import { peminjamanService } from '../../services/peminjamanService';
import { INVENTORY_STATUSES } from '../../types/inventory';
import type { MyInventory, MyInventoryItem, MyPenanganan, RiwayatPerbaikan } from '../../types/myInventory';
import type { Paginated } from '../../types/user';
import PenangananLaporModal from '../MasterData/Inventory/PenangananLaporModal';
import NotificationPanel from './NotificationPanel';
import UserReturnModal from './UserReturnModal';

// tombol ikon kecil (sama dengan halaman Inventory)
const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60';

function StatusBadge({ status }: { status: MyInventoryItem['status'] }) {
  const st = INVENTORY_STATUSES.find((s) => s.key === status);
  return st ? <Badge dot={st.dot}>{st.label}</Badge> : null;
}

const KARTU_PER_HALAMAN = 2; // tampilan kartu: 2 barang utama per halaman
const LAPORAN_PER_HALAMAN = 2; // laporan kerusakan: 2 per halaman
const RIWAYAT_PER_HALAMAN = 3; // riwayat perbaikan di kolom kanan: 3 per halaman, sisanya lewat paginasi
const BATAS_LAPORAN_SELESAI_MS = 24 * 60 * 60 * 1000; // laporan yang sudah selesai tetap tampil sampai 24 jam

// satu unit: barang utama atau kelengkapannya (`induk` = barang utama yang memuatnya)
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

// dashboard user: ringkasan ringkas, daftar barang dalam tampilan kartu, dan laporan kerusakan berjalan
export default function UserDashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MyInventory[]>();
  const [kartuPage, setKartuPage] = useState(1);
  const [laporanPage, setLaporanPage] = useState(1);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [printing, setPrinting] = useState<number | null>(null);

  const [reportTarget, setReportTarget] = useState<MyInventoryItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<MyInventory | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const [riwayat, setRiwayat] = useState<Paginated<RiwayatPerbaikan>>();
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatError, setRiwayatError] = useState('');

  // lama pemakaian / laporan ikut berjalan tanpa perlu muat ulang halaman
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

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

  // riwayat perbaikan (tidak ikut daftar barang: tetap ada walau barangnya sudah dikembalikan)
  useEffect(() => {
    let batal = false;
    myInventoryService
      .riwayatPerbaikan(riwayatPage, RIWAYAT_PER_HALAMAN)
      .then((d) => {
        if (batal) return;
        // halaman terakhir mungkin sudah kosong (data berkurang): mundur ke halaman terakhir yang ada
        if (d.data.length === 0 && riwayatPage > 1) setRiwayatPage(Math.max(1, d.last_page));
        else setRiwayat(d);
        setRiwayatError('');
      })
      .catch((e) => {
        if (!batal) setRiwayatError(getErrorMessage(e));
      });
    return () => {
      batal = true;
    };
  }, [riwayatPage, reloadKey]);

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
  // laporan yang masih berjalan + yang selesai kurang dari 24 jam lalu (hilang sendiri lewat 24 jam, ikut jam yang berjalan)
  const laporan: LaporanAktif[] = units
    .flatMap(({ item: b }) => {
      const selesaiBaru =
        b.penanganan_selesai?.selesai_at &&
        now.getTime() - new Date(b.penanganan_selesai.selesai_at).getTime() < BATAS_LAPORAN_SELESAI_MS
          ? b.penanganan_selesai
          : null;
      return [b.penanganan, selesaiBaru].flatMap((p) =>
        p ? [{ ...p, kode: b.kode_inventory, nama: b.nama || b.merk || b.kode_inventory }] : [],
      );
    })
    .sort((a, b) => Number(a.status === 'selesai') - Number(b.status === 'selesai')); // yang berjalan di atas
  const bermasalah = units.filter(({ item }) => item.status !== 'dipakai' && item.status !== 'tersedia').length;
  // pemakaian terlama = serah terima paling awal (tanggal, lalu jam pencatatan)
  const tertua = (items ?? [])
    .filter((i) => i.tanggal_penerimaan)
    .sort((a, b) => a.tanggal_penerimaan!.localeCompare(b.tanggal_penerimaan!) || (a.waktu_penerimaan ?? '').localeCompare(b.waktu_penerimaan ?? ''))[0];

  // kartu
  const kartuCount = Math.max(1, Math.ceil((items?.length ?? 0) / KARTU_PER_HALAMAN));
  const kartuCurrent = Math.min(kartuPage, kartuCount);
  const kartuRows = (items ?? []).slice((kartuCurrent - 1) * KARTU_PER_HALAMAN, kartuCurrent * KARTU_PER_HALAMAN);

  // laporan kerusakan
  const laporanCount = Math.max(1, Math.ceil(laporan.length / LAPORAN_PER_HALAMAN));
  const laporanCurrent = Math.min(laporanPage, laporanCount);
  const laporanRows = laporan.slice((laporanCurrent - 1) * LAPORAN_PER_HALAMAN, laporanCurrent * LAPORAN_PER_HALAMAN);

  const stats = [
    { label: 'Barang utama', value: String(items?.length ?? 0) },
    { label: 'Total unit', value: String(units.length) },
    { label: 'Perlu perhatian', value: String(bermasalah) },
    { label: 'Pemakaian terlama', value: tertua ? lamaSejak(tertua.tanggal_penerimaan!, tertua.waktu_penerimaan, now) : '-' },
  ];

  return (
    <div className="min-w-0 space-y-4">
      {/* ===== judul ===== */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Inventory saya</h1>
          <p className="mt-0.5 truncate text-xs text-ink-muted">Halo, {user?.name}</p>
        </div>
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
                  <div key={s.label} className="flex flex-col items-start px-4 py-2.5">
                    <p className="text-[11px] text-ink-muted">{s.label}</p>
                    <p className="text-base font-semibold tabular-nums leading-tight md:text-lg">{s.value}</p>
                  </div>
                ))}
              </section>

              {/* ===== tampilan kartu ===== */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {kartuRows.map((item) => (
                    <article key={item.id} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface">
                      {/* kepala: nama, kode, status */}
                      <header className="flex items-start gap-3 p-4 pb-3">
                        {item.foto_url ? (
                          <button
                            type="button"
                            title="Perbesar foto"
                            aria-label={`Perbesar foto ${item.kode_inventory}`}
                            onClick={() => setZoomUrl(item.foto_url)}
                            className="size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-line bg-hover p-0 transition hover:opacity-90"
                          >
                            <img src={item.foto_url} alt={`Foto ${item.nama || item.kode_inventory}`} loading="lazy" className="size-full object-cover" />
                          </button>
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-hover text-ink-muted" role="img" aria-label="Tanpa foto">
                            <ImageOff size={18} />
                          </span>
                        )}
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
                          <span className="font-medium text-ink">{item.tanggal_penerimaan ? tglJamSama(item.tanggal_penerimaan, item.waktu_penerimaan) : '-'}</span>
                          {item.tanggal_penerimaan && ` (${lamaSejak(item.tanggal_penerimaan, item.waktu_penerimaan, now)})`}
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
                <div className="flex justify-end">
                  <Pagination page={kartuCurrent} pageCount={kartuCount} onPageChange={setKartuPage} />
                </div>
              </div>

              {/* ===== laporan kerusakan berjalan (hanya muncul kalau ada) ===== */}
              {laporan.length > 0 && (
                <section className="rounded-xl border border-line bg-surface">
                  <h2 className="px-4 pb-2 pt-3.5 text-sm font-semibold">Laporan kerusakan</h2>
                  <ul className="divide-y divide-line/60 border-t border-line">
                    {laporanRows.map((l) => {
                      const sejakLapor = l.lapor_at ? `${formatLama(l.lapor_at, now)} lalu` : lamaLalu(l.tanggal_lapor, null, now);
                      return (
                        <li key={l.id} className="space-y-2.5 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-x-6 sm:space-y-0">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 break-words text-sm font-medium">{l.nama}</p>
                              {l.status === 'selesai' && (
                                <span className="shrink-0">
                                  <Badge dot={l.hasil === 'berhasil' ? 'bg-success' : 'bg-danger'}>
                                    {l.hasil === 'berhasil' ? 'Berhasil' : 'Tidak bisa diperbaiki'}
                                  </Badge>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted">
                              {l.kode} · {l.jenis_label}
                            </p>
                            <p className="text-xs text-ink-muted">
                              Dilapor <span className="whitespace-nowrap">{tglJamSama(l.tanggal_lapor, l.lapor_at)}</span>{' '}
                              <span className="whitespace-nowrap">· {sejakLapor}</span>
                            </p>
                            {l.status === 'selesai' && l.tanggal_selesai && (
                              <p className="text-xs text-ink-muted">
                                Selesai <span className="whitespace-nowrap">{tglJam(l.tanggal_selesai, l.selesai_at)}</span>
                                {l.selesai_at && <span className="whitespace-nowrap"> · {formatLama(l.selesai_at, now)} lalu</span>}
                              </p>
                            )}
                          </div>
                          <Tahap aktif={l.status === 'selesai' ? 2 : l.status === 'dilaporkan' ? 0 : 1} />
                        </li>
                      );
                    })}
                  </ul>
                  {laporanCount > 1 && (
                    <div className="flex justify-end border-t border-line px-4 py-3">
                      <Pagination page={laporanCurrent} pageCount={laporanCount} onPageChange={setLaporanPage} />
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        {/* ===== kolom kanan: notifikasi, kondisi unit ===== */}
        <aside className="min-w-0 space-y-4">
          <NotificationPanel />

          {/* ===== riwayat perbaikan barang user (3 per halaman, sisanya lewat paginasi) ===== */}
          <section className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Riwayat perbaikan barang mu</h2>
              {riwayat && riwayat.total > 0 && <span className="shrink-0 text-xs text-ink-muted">{riwayat.total} perbaikan</span>}
            </div>

            {riwayatError && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{riwayatError}</p>}

            {!riwayat && !riwayatError && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-muted">
                <Loader2 size={14} className="animate-spin" />
                Memuat...
              </div>
            )}

            {riwayat && riwayat.data.length === 0 && (
              <p className="py-6 text-center text-xs text-ink-muted">Belum ada riwayat perbaikan.</p>
            )}

            {riwayat && riwayat.data.length > 0 && (
              <ul className="mt-3 divide-y divide-line/60">
                {riwayat.data.map((r) => (
                  <li key={r.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-medium">{r.nama || r.kode_inventory}</p>
                        <p className="break-words text-[11px] text-ink-muted">{[r.kode_inventory, r.jenis_label].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="shrink-0">
                        <Badge dot={r.hasil === 'berhasil' ? 'bg-success' : 'bg-danger'}>
                          {r.hasil === 'berhasil' ? 'Berhasil' : 'Tidak bisa diperbaiki'}
                        </Badge>
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] text-ink-soft">{r.keluhan}</p>
                    <p className="text-[11px] text-ink-muted">
                      Dilapor {tglJamSama(r.tanggal_lapor, r.lapor_at)}
                      {r.tanggal_selesai && <> · selesai {tglJam(r.tanggal_selesai, r.selesai_at)}</>}
                      {r.lapor_at && r.selesai_at && ` (${formatLama(r.lapor_at, r.selesai_at)})`}
                    </p>
                    {r.hasil === 'tidak_bisa_diperbaiki' && r.catatan && (
                      <p className="line-clamp-2 text-[11px] text-ink-muted">Alasan: {r.catatan}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {riwayat && riwayat.last_page > 1 && (
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  className={iconBtn}
                  disabled={riwayat.current_page <= 1}
                  onClick={() => setRiwayatPage(riwayat.current_page - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] tabular-nums text-ink-muted">
                  Halaman {riwayat.current_page} / {riwayat.last_page}
                </span>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  className={iconBtn}
                  disabled={riwayat.current_page >= riwayat.last_page}
                  onClick={() => setRiwayatPage(riwayat.current_page + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      <PenangananLaporModal open={reportOpen} inventory={reportTarget} onClose={() => setReportOpen(false)} onSaved={reload} />
      <ImageZoomModal open={zoomUrl !== null} onClose={() => setZoomUrl(null)} src={zoomUrl} alt="Foto inventory" />
      <UserReturnModal open={returnOpen} inventory={returnTarget} onClose={() => setReturnOpen(false)} onSaved={reload} />
    </div>
  );
}