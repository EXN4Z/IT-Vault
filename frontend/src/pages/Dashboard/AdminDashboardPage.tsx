import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, MonitorCog, Package } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { btnOutline, btnSolid } from '../../components/ui/buttonStyles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../lib/errors';
import { formatTanggal } from '../../lib/waktu';
import { inventoryService } from '../../services/inventoryService';
import { penangananService } from '../../services/penangananService';
import { INVENTORY_STATUSES, type InventoryRow, type InventoryStatus } from '../../types/inventory';
import type { Penanganan } from '../../types/penanganan';

const BATAS_HARI = 7; // sama dengan halaman Penanganan: laporan belum diterima lebih dari ini = terlambat

type StatusCount = Record<InventoryStatus, number>;

interface DashboardData {
  perStatus: StatusCount;
  total: number;
  terbaru: InventoryRow[];
  menunggu: Penanganan[];
  jumlahMenunggu: number;
  diproses: number;
  berhasil: number;
  rusakBerat: number;
  terlambat: number;
}

// selisih hari kalender antara 'YYYY-MM-DD' dan hari ini
function hariSejak(tanggal: string): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((hariIni.getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
}

// semua angka dashboard diambil dari endpoint yang sudah ada (total tiap status = `total` dari paginasi)
async function loadDashboard(): Promise<DashboardData> {
  const [counts, terbaru, menunggu, diproses, berhasil, rusakBerat] = await Promise.all([
    Promise.all(INVENTORY_STATUSES.map((s) => inventoryService.list(1, 1, s.key))),
    inventoryService.list(1, 5, undefined, undefined, 'kode_inventory', 'desc'),
    penangananService.list(1, 5, 'menunggu'),
    penangananService.list(1, 1, 'diproses'),
    penangananService.list(1, 1, 'berhasil'),
    penangananService.list(1, 1, 'rusak_berat'),
  ]);

  const perStatus = Object.fromEntries(INVENTORY_STATUSES.map((s, i) => [s.key, counts[i].total])) as StatusCount;

  return {
    perStatus,
    total: Object.values(perStatus).reduce((a, b) => a + b, 0),
    terbaru: terbaru.data,
    menunggu: menunggu.data,
    jumlahMenunggu: menunggu.total,
    diproses: diproses.total,
    berhasil: berhasil.total,
    rusakBerat: rusakBerat.total,
    terlambat: menunggu.terlambat,
  };
}

const card = 'rounded-xl border border-line bg-surface p-5';
const label = 'text-xs text-ink-muted';
const caption = 'text-[11px] font-medium uppercase tracking-wide text-ink-muted';
const num = (v: number | undefined) => (v === undefined ? '-' : v.toLocaleString('id-ID'));

// satu baris "label ........ nilai" (seperti rincian di kartu Order pada desain)
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={label}>{name}</span>
      <span className="text-sm font-medium tabular-nums text-ink">{children}</span>
    </div>
  );
}

// dashboard admin: grid kartu mengikuti desain referensi (sidebar dan top bar tetap dari AppLayout)
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');

  useEffect(() => {
    let batal = false;
    loadDashboard()
      .then((d) => {
        if (!batal) setData(d);
      })
      .catch((e) => {
        if (!batal) setError(getErrorMessage(e));
      });
    return () => {
      batal = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      {/* ===== judul ===== */}
      <div className="mb-4 px-1">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="mt-0.5 text-xs text-ink-muted">Halo, {user?.name}</p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ===== kolom kiri: total inventory + pemakaian ===== */}
        <div className="flex flex-col gap-4 lg:row-span-2">
          <section className={`${card} flex flex-1 flex-col`}>
            <p className={caption}>Total inventory</p>
            <p className="mt-1.5 text-4xl font-semibold tabular-nums">{num(data?.total)}</p>

            <p className={`${caption} mb-1 mt-6`}>Per status</p>
            <div className="divide-y divide-line/60">
              {INVENTORY_STATUSES.map((s) => (
                <Row key={s.key} name={s.label}>
                  {num(data?.perStatus[s.key])}
                </Row>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-6">
              <Link to="/transaksi/penanganan" className={`${btnSolid} h-9`}>
                Buka Penanganan
              </Link>
              <Link to="/master-data?tab=inventory" className={`${btnOutline} h-9`}>
                Lihat Inventory
              </Link>
            </div>
          </section>

          <section className={card}>
            <p className="text-lg font-semibold leading-snug">Pemakaian</p>
            <div className="mt-3 divide-y divide-line/60">
              <Row name="Sedang dipakai">{num(data?.perStatus.dipakai)}</Row>
              <Row name="Siap dipakai">{num(data?.perStatus.tersedia)}</Row>
            </div>
          </section>
        </div>

        {/* ===== kolom tengah: inventory terbaru ===== */}
        <section className={card}>
          <h2 className="mb-4 text-sm font-semibold">Inventory terbaru</h2>
          {data && data.terbaru.length === 0 && (
            <p className="py-6 text-center text-xs text-ink-muted">Belum ada inventory.</p>
          )}
          <ul className="space-y-4">
            {(data?.terbaru ?? []).map((item) => {
              const st = INVENTORY_STATUSES.find((s) => s.key === item.status);
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-hover text-ink-muted">
                    <Package size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.nama || item.merk || item.kode_inventory}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {item.kode_inventory}
                      {item.kategori ? ` · ${item.kategori.nama}` : ''}
                    </p>
                  </div>
                  {st && <Badge dot={st.dot}>{st.label}</Badge>}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ===== kolom kanan: ringkasan penanganan (kartu dengan angka besar) ===== */}
        <section className={`${card} lg:shadow-md`}>
          <h2 className="text-sm font-semibold">Penanganan kerusakan</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Laporan dari pemakai ke tim IT</p>

          <div className="mt-4 divide-y divide-line/60">
            <Row name="Menunggu diterima">{num(data?.jumlahMenunggu)}</Row>
            <Row name={`Terlambat (lebih dari ${BATAS_HARI} hari)`}>{num(data?.terlambat)}</Row>
            <Row name="Sedang diperbaiki">{num(data?.diproses)}</Row>
            <Row name="Berhasil diperbaiki">{num(data?.berhasil)}</Row>
            <Row name="Rusak berat">{num(data?.rusakBerat)}</Row>
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <div>
              <p className={caption}>Perlu tindakan</p>
              <p className="mt-0.5 text-xs text-ink-muted">Menunggu + sedang diperbaiki</p>
            </div>
            <p className="text-4xl font-light tabular-nums">
              {data ? (data.jumlahMenunggu + data.diproses).toLocaleString('id-ID') : '-'}
            </p>
          </div>
        </section>

        {/* ===== bawah: tabel laporan menunggu (2 kolom, seperti "Destination") ===== */}
        <section className={`${card} p-0 lg:col-span-2`}>
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Laporan menunggu diterima</h2>
              <Link to="/transaksi/penanganan" className="text-xs text-ink-muted transition hover:text-ink">
                Lihat semua
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className={label}>Menunggu</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.jumlahMenunggu)}</p>
              </div>
              <div>
                <p className={label}>Terlambat</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.terlambat)}</p>
              </div>
              <div>
                <p className={label}>Diproses</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.diproses)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Barang</th>
                  <th className="px-3 py-2.5 font-medium">Jenis</th>
                  <th className="px-3 py-2.5 font-medium">Pelapor</th>
                  <th className="px-3 py-2.5 font-medium">Tanggal lapor</th>
                  <th className="px-5 py-2.5 text-right font-medium">Menunggu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {data?.menunggu.map((p) => {
                  const hari = hariSejak(p.tanggal_lapor);
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-ink">{p.inventory?.nama || p.inventory?.kode_inventory}</p>
                        <p className="text-ink-muted">{p.inventory?.kode_inventory}</p>
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">{p.jenis_label}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{p.pelapor ?? '-'}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{formatTanggal(p.tanggal_lapor)}</td>
                      <td
                        className={`px-5 py-2.5 text-right tabular-nums ${hari > BATAS_HARI ? 'font-semibold text-danger' : 'text-ink-soft'}`}
                      >
                        {hari} hari
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data && data.menunggu.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-muted">
                <Inbox size={14} />
                Tidak ada laporan yang menunggu.
              </div>
            )}
            {!data && !error && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-muted">
                <MonitorCog size={14} />
                Memuat...
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}