import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, Inbox } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { btnOutline, btnSolid } from '../../components/ui/buttonStyles';
import { getErrorMessage } from '../../lib/errors';
import { formatLama, hariSejak, lamaSejak, tglJam } from '../../lib/waktu';
import { inventoryService } from '../../services/inventoryService';
import { penangananService } from '../../services/penangananService';
import { INVENTORY_STATUSES, type InventoryRow, type InventoryStatus } from '../../types/inventory';
import type { Penanganan } from '../../types/penanganan';
import { AngkaBone, ChartHeaderSkeleton, ChartSkeleton, MenungguRowsSkeleton, NotifikasiSkeleton, TerbaruSkeleton } from './AdminDashboardSkeleton';
import NotificationPanel from './NotificationPanel';
import Tooltip from '../../components/ui/Tooltip';

const BATAS_HARI = 7; // sama dengan halaman Penanganan: laporan belum diterima lebih dari ini = terlambat

type StatusCount = Record<InventoryStatus, number>;

interface PembelianTitik {
  label: string;
  judul: string;
  jumlah: number;
}

interface DashboardData {
  perStatus: StatusCount;
  total: number;
  terbaru: InventoryRow[];
  trenBulanan: PembelianTitik[];
  menunggu: Penanganan[];
  jumlahMenunggu: number;
  diproses: number;
  berhasil: number;
  rusakBerat: number;
  terlambat: number;
}

// ===== KOMPONEN CHART DARI KODE LAMA =====
const W_DEFAULT = 720; // lebar awal sebelum kartu diukur; setelah itu mengikuti lebar kartu (teks tetap terbaca di HP)
const H = 190;
const PAD_L = 44;
const PAD_R = 16;
const Y_TOP = 60;
const Y_BASE = 160;

function skala(vals: number[]) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pilihan = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  let step = pilihan[pilihan.length - 1];
  for (const s of pilihan) {
    if (Math.floor(min / s) * s + 3 * s >= max) {
      step = s;
      break;
    }
  }
  return { lo: Math.floor(min / step) * step, step };
}

function smooth(p: [number, number][]): string {
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]}`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i];
    const b = p[i];
    const c = p[i + 1];
    const e = p[i + 2] ?? c;
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6}, ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6}, ${c[0]} ${c[1]}`;
  }
  return d;
}

function PertumbuhanChart({ rows, judulChart = 'Pertumbuhan inventory per bulan' }: { rows: PembelianTitik[]; judulChart?: string }) {
  const last = rows.length - 1;
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(W_DEFAULT);

  // ukur lebar kartu, lalu pakai sebagai lebar viewBox supaya skala 1:1 (tidak mengecil di layar sempit)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ukur = () => setW(Math.max(Math.round(el.clientWidth), 260));
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const active = hover !== null && hover <= last ? hover : last;

  if (rows.length === 0) return null;

  const vals = rows.map((r) => r.jumlah);
  const { lo, step } = skala(vals);
  const top = lo + step * 3;
  const y = (v: number) => Y_BASE - ((v - lo) / (top - lo)) * (Y_BASE - Y_TOP);
  const x = (i: number) => (rows.length === 1 ? (PAD_L + W - PAD_R) / 2 : PAD_L + (i * (W - PAD_L - PAD_R)) / (rows.length - 1));

  const pts = vals.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L${pts[last][0]} ${Y_BASE} L${pts[0][0]} ${Y_BASE} Z`;
  const q = pts[active];

  const diff = active > 0 ? vals[active] - vals[active - 1] : null;
  const deltaText = diff === null ? 'Data awal' : `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)} Unit`;
  const deltaTurun = diff !== null && diff < 0;
  const namaBulan = rows[active].judul;

  const BW = 110;
  const bx = Math.min(Math.max(q[0] - BW / 2, 4), W - BW - 4);
  const by = Math.max(q[1] - 70, 2);

  const onMove = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) * W) / r.width;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((pt, i) => {
      const dd = Math.abs(pt[0] - vx);
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    });
    if (best !== hover) setHover(best);
  };

  return (
    <div ref={wrapRef} className="w-full min-w-0">
      <svg
        className="block h-auto w-full select-none overflow-visible"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${judulChart}. ${namaBulan}: ${vals[active]} unit.`}
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
        onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
      >
        <defs>
          <linearGradient id="chart-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" className="text-accent" stopOpacity={0.28} />
            <stop offset="100%" stopColor="currentColor" className="text-accent" stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((i) => {
          const v = lo + i * step;
          return (
            <g key={v}>
              <line x1={PAD_L - 14} x2={W - 4} y1={y(v)} y2={y(v)} className="stroke-line" />
              <text x={0} y={y(v) + 3} fontSize={10} className="fill-ink-muted">
                {v}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#chart-area-fill)" />
        <path d={line} fill="none" strokeWidth={2.2} strokeLinecap="round" className="stroke-accent" />

        {pts.map((pt, i) =>
          i === active ? null : (
            <circle key={i} cx={pt[0]} cy={pt[1]} r={3} strokeWidth={1.5} className="fill-surface stroke-accent" />
          ),
        )}

        <line x1={q[0]} x2={q[0]} y1={q[1] + 9} y2={Y_BASE} strokeDasharray="3 3" className="stroke-accent" />
        <circle cx={q[0]} cy={q[1]} r={9} className="fill-accent/15" />
        <circle cx={q[0]} cy={q[1]} r={5} strokeWidth={2} className="fill-accent stroke-surface" />

        {/* Tooltip */}
        <rect x={bx} y={by} width={BW} height={52} rx={8} className="fill-ink" />
        <polygon points={`${q[0] - 5},${by + 52} ${q[0] + 5},${by + 52} ${q[0]},${by + 58}`} className="fill-ink" />
        <text x={bx + 12} y={by + 17} fontSize={9} className="fill-surface opacity-70">
          {namaBulan}
        </text>
        <text x={bx + 12} y={by + 34} fontSize={14} fontWeight={700} className="fill-surface">
          {vals[active]} Unit
        </text>
        <text x={bx + 12} y={by + 46} fontSize={9} className={deltaTurun ? 'fill-danger' : 'fill-success'}>
          {deltaText}
        </text>

        {rows.map((r, i) => (
          <text
            key={r.label + i}
            x={pts[i][0]}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fontWeight={i === active ? 700 : 400}
            className={i === active ? 'fill-ink' : 'fill-ink-muted'}
          >
            {r.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Hitung distribusi 6 bulan terakhir dari data inventory yang ada
function hitungTrenBulanan(list: InventoryRow[]): PembelianTitik[] {
  const bulanPendek = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const bulanPenuh = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  const buckets: { key: string; label: string; judul: string; jumlah: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: bulanPendek[d.getMonth()],
      judul: `${bulanPenuh[d.getMonth()]} ${d.getFullYear()}`,
      jumlah: 0,
    });
  }

  for (const item of list) {
    const raw = (item as InventoryRow & { tanggal_invoice?: string; created_at?: string }).tanggal_invoice ??
      (item as InventoryRow & { created_at?: string }).created_at;
    if (!raw) continue;
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) continue;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const found = buckets.find((b) => b.key === key);
    if (found) found.jumlah += 1;
  }

  return buckets.map(({ label, judul, jumlah }) => ({ label, judul, jumlah }));
}

// semua angka dashboard diambil dari endpoint yang sudah ada (total tiap status = `total` dari paginasi)
async function loadDashboard(): Promise<DashboardData> {
  const [counts, terbaru, menunggu, diproses, berhasil, rusakBerat] = await Promise.all([
    Promise.all(INVENTORY_STATUSES.map((s) => inventoryService.list(1, 1, s.key))),
    inventoryService.list(1, 100, undefined, undefined, 'kode_inventory', 'desc'),
    penangananService.list(1, 5, 'menunggu'),
    penangananService.list(1, 1, 'diproses'),
    penangananService.list(1, 1, 'berhasil'),
    penangananService.list(1, 1, 'rusak_berat'),
  ]);

  const perStatus = Object.fromEntries(INVENTORY_STATUSES.map((s, i) => [s.key, counts[i].total])) as StatusCount;

  return {
    perStatus,
    total: Object.values(perStatus).reduce((a, b) => a + b, 0),
    terbaru: terbaru.data.slice(0, 5),
    trenBulanan: hitungTrenBulanan(terbaru.data),
    menunggu: menunggu.data,
    jumlahMenunggu: menunggu.total,
    diproses: diproses.total,
    berhasil: berhasil.total,
    rusakBerat: rusakBerat.total,
    terlambat: menunggu.terlambat,
  };
}

const card = 'min-w-0 rounded-sm border border-line bg-surface p-4 sm:p-5';
const label = 'text-xs text-ink-muted';
const caption = 'text-[11px] font-medium uppercase tracking-wide text-ink-muted';

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
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  const loading = !data && !error;

  // angka kosong = masih dimuat -> balok skeleton; kalau request gagal tampil '-' (ukuran balok bisa disesuaikan dengan teksnya)
  const num = (v: number | undefined, bone?: string) =>
    v === undefined ? (loading ? <AngkaBone className={bone} /> : '-') : v.toLocaleString('id-ID');

  // lama menunggu ikut berjalan tanpa perlu muat ulang halaman
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

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

  const tren = data?.trenBulanan ?? [];
  const bulanIni = tren[tren.length - 1]?.jumlah ?? 0;
  const bulanLalu = tren.length > 1 ? tren[tren.length - 2].jumlah : 0;
  const selisih = bulanIni - bulanLalu;

  return (
    <div className="mx-auto max-w-6xl space-y-4" aria-busy={loading}>

      {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

      {/* ===== BARIS ATAS: CHART (KIRI, 2 KOLOM) + NOTIFIKASI (KANAN, 1 KOLOM) ===== */}
      {/* grid-cols-1 = minmax(0,1fr): kolom tidak bisa melebar melebihi layar di HP */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        <section className={`${card} flex flex-col justify-between lg:col-span-2`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div>
              <h2 className="text-sm font-semibold">Pertumbuhan inventory</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Penambahan unit dalam 6 bulan terakhir</p>
            </div>
            {data ? (
              <div className="ml-auto text-right">
                <p className="text-lg font-semibold tabular-nums leading-tight">{num(bulanIni)} Unit</p>
                <p className={`text-[11px] font-medium ${selisih < 0 ? 'text-danger' : 'text-success'}`}>
                  {selisih > 0 ? `▲ +${selisih}` : selisih < 0 ? `▼ ${selisih}` : '0'} dari bulan lalu
                </p>
              </div>
            ) : (
              loading && (
                <div className="ml-auto">
                  <ChartHeaderSkeleton />
                </div>
              )
            )}
          </div>

          {loading ? (
            <ChartSkeleton />
          ) : tren.length === 0 ? (
            <div className="flex h-[190px] items-center justify-center text-xs text-ink-muted">Belum ada data inventory.</div>
          ) : (
            <PertumbuhanChart rows={tren} />
          )}
        </section>

        <div className="min-w-0">
          <NotificationPanel skeleton={<NotifikasiSkeleton />} />
        </div>
      </div>

      {/* ===== GRID UTAMA 3 KOLOM ===== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ===== kolom kiri: total inventory + pemakaian ===== */}
        <div className="flex min-w-0 flex-col gap-4 lg:row-span-2">
          <section className={`${card} flex flex-1 flex-col`}>
            <p className={caption}>Total inventory</p>
            <p className="mt-1.5 text-4xl font-semibold tabular-nums">{num(data?.total, 'h-9 w-20')}</p>

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
          {loading && <TerbaruSkeleton />}
          <ul className="space-y-4">
            {(data?.terbaru ?? []).map((item) => {
              const st = INVENTORY_STATUSES.find((s) => s.key === item.status);
              return (
                <li key={item.id} className="flex items-center gap-3">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt={`Foto ${item.nama || item.kode_inventory}`}
                      loading="lazy"
                      className="size-10 shrink-0 rounded-lg border border-line bg-hover object-cover"
                    />
                  ) : (
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-hover text-ink-muted"
                      role="img"
                      aria-label="Tanpa foto"
                    >
                      <ImageOff size={16} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <Tooltip className="block min-w-0" onlyWhenTruncated>
                      <p className="truncate text-sm font-medium">{item.nama || item.merk || item.kode_inventory}</p>
                    </Tooltip>
                    <Tooltip className="block min-w-0" onlyWhenTruncated>
                      <p className="truncate text-xs text-ink-muted">
                        {item.kode_inventory}
                        {item.kategori ? ` · ${item.kategori.nama}` : ''}
                      </p>
                    </Tooltip>
                  </div>
                  {st && (
                    <span className="shrink-0">
                      <Badge dot={st.dot}>{st.label}</Badge>
                    </span>
                  )}
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
              {data ? (data.jumlahMenunggu + data.diproses).toLocaleString('id-ID') : num(undefined, 'h-9 w-14')}
            </p>
          </div>
        </section>

        {/* ===== bawah: tabel laporan menunggu (2 kolom, seperti "Destination") ===== */}
        <section className={`${card} p-0 lg:col-span-2`}>
          <div className="p-4 pb-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Laporan menunggu diterima</h2>
              <Link to="/transaksi/penanganan" className="text-xs text-ink-muted transition hover:text-ink">
                Lihat semua
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className={label}>Menunggu</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.jumlahMenunggu, 'h-6 w-8')}</p>
              </div>
              <div>
                <p className={label}>Terlambat</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.terlambat, 'h-6 w-8')}</p>
              </div>
              <div>
                <p className={label}>Diproses</p>
                <p className="text-xl font-semibold tabular-nums">{num(data?.diproses, 'h-6 w-8')}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-left text-xs md:min-w-[600px]">
              <thead className="hidden md:table-header-group">
                <tr className="text-ink-muted">
                  <th className="px-4 py-2.5 font-medium sm:px-5">Barang</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">Jenis</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">Pelapor</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">Waktu lapor</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:px-5 md:table-cell">Menunggu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {loading && <MenungguRowsSkeleton />}
                {data?.menunggu.map((p) => {
                  const hari = hariSejak(p.tanggal_lapor, now);
                  const lama = p.lapor_at ? formatLama(p.lapor_at, now) : lamaSejak(p.tanggal_lapor, null, now);
                  const terlambat = hari > BATAS_HARI;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 md:py-2.5 sm:px-5">
                        <p className="break-words font-medium text-ink">{p.inventory?.nama || p.inventory?.kode_inventory}</p>
                        <p className="text-ink-muted">{p.inventory?.kode_inventory}</p>
                        {/* HP: kolom Jenis / Pelapor / Waktu lapor disembunyikan, ringkasannya di sini */}
                        <p className="mt-0.5 text-ink-soft md:hidden">
                          {[p.jenis_label, p.pelapor].filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-ink-muted md:hidden">{tglJam(p.tanggal_lapor, p.lapor_at)}</p>
                        {/* HP: lama menunggu ditaruh di bawah (kolom kanan disembunyikan supaya teks tidak kepepet) */}
                        <p className={`mt-1.5 font-medium md:hidden ${terlambat ? 'text-danger' : 'text-ink'}`}>
                          Menunggu {lama}
                        </p>
                      </td>
                      <td className="hidden px-3 py-2.5 text-ink-soft md:table-cell">{p.jenis_label}</td>
                      <td className="hidden px-3 py-2.5 text-ink-soft md:table-cell">{p.pelapor ?? '-'}</td>
                      <td className="hidden px-3 py-2.5 text-ink-soft md:table-cell">{tglJam(p.tanggal_lapor, p.lapor_at)}</td>
                      <td
                        className={`hidden whitespace-nowrap px-4 py-2.5 text-right tabular-nums sm:px-5 md:table-cell ${terlambat ? 'font-semibold text-danger' : 'text-ink-soft'}`}
                      >
                        {lama}
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
          </div>
        </section>
      </div>
    </div>
  );
}