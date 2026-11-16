import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import SearchField from '../../../components/ui/SearchField';
import SegmentedTabs from '../../../components/ui/SegmentedTabs';
import { ComboBox } from '../../../components/form';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage } from '../../../lib/errors';
import { tglJam } from '../../../lib/waktu';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import PenangananDetailModal from './PenangananDetailModal';
import PenangananTerimaModal from './PenangananTerimaModal';
import { JENIS_KERUSAKAN, TAB_PENANGANAN, type Penanganan, type TabPenanganan } from '../../../types/penanganan';

const PER_PAGE = 10;
const BATAS_HARI = 7; // laporan yang belum diterima lebih dari ini ditandai terlambat

const JENIS_OPTIONS = JENIS_KERUSAKAN.map((j) => ({ value: j.key, label: j.label }));

// selisih hari kalender antara tanggal lapor ('YYYY-MM-DD') dan hari ini
function hariSejak(tanggal: string): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  const lapor = new Date(y, m - 1, d);
  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((hariIni.getTime() - lapor.getTime()) / 86_400_000));
}

// halaman Penanganan Inventory: antrian laporan kerusakan sampai selesai diperbaiki.
// Lapor dilakukan dari halaman Inventory; di sini hanya memproses (terima, selesaikan) dan memantau.
export default function PenangananPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(''); // isi kolom cari (langsung)
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [jenis, setJenis] = useState(''); // '' = semua jenis kerusakan
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Penanganan[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [terlambat, setTerlambat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0); // naikkan untuk memuat ulang tabel

  // modal detail (`detailTarget` sengaja tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Penanganan | null>(null);

  // modal terima laporan (target tidak di-null-kan saat tutup, alasannya sama)
  const [terimaOpen, setTerimaOpen] = useState(false);
  const [terimaTarget, setTerimaTarget] = useState<Penanganan | null>(null);

  const openTerima = (p: Penanganan) => {
    setTerimaTarget(p);
    setTerimaOpen(true);
  };

  const openDetail = (p: Penanganan) => {
    setDetailTarget(p);
    setDetailOpen(true);
  };

  // tab diambil dari URL (?status=menunggu), default 'menunggu'
  const statusParam = params.get('status');
  const tab: TabPenanganan = TAB_PENANGANAN.find((t) => t.key === statusParam)?.key ?? 'menunggu';
  const label = TAB_PENANGANAN.find((t) => t.key === tab)!.label;

  const changeTab = (key: TabPenanganan) => {
    setParams({ status: key }, { replace: true });
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

  // ambil data saat halaman / tab / jenis / pencarian berganti
  useEffect(() => {
    let ignore = false; // kalau request lama selesai belakangan, hasilnya dibuang
    setLoading(true);
    setError('');
    setRows([]);
    setTotal(0);
    penangananService
      .list(page, PER_PAGE, tab, jenis, search)
      .then((res) => {
        if (ignore) return;
        setRows(res.data);
        setPageCount(res.last_page);
        setTotal(res.total);
        setTerlambat(res.terlambat);
      })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, tab, jenis, search, reloadKey]);

  const columns: Column<Penanganan>[] = [
    {
      key: 'foto', header: 'Foto', width: '64px',
      cell: (p) => (
        <a href={p.foto_url} target="_blank" rel="noreferrer" title="Lihat foto kerusakan">
          <img src={p.foto_url} alt="Foto kerusakan" className="size-9 rounded-md border border-line object-cover" />
        </a>
      ),
    },
    { key: 'kode', header: 'Kode', width: '120px', cell: (p) => <span className="truncate font-semibold">{p.inventory?.kode_inventory ?? '-'}</span> },
    { key: 'nama', header: 'Nama Barang', width: 'minmax(0,1fr)', cell: (p) => <span className="truncate font-semibold">{p.inventory?.nama ?? '-'}</span> },
    { key: 'jenis', header: 'Jenis', width: '140px', cell: (p) => <span className="truncate">{p.jenis_label}</span> },
    { key: 'keluhan', header: 'Keluhan', width: 'minmax(0,1.4fr)', cell: (p) => <span className="truncate text-ink-soft" title={p.keluhan}>{p.keluhan}</span> },
    { key: 'pelapor', header: 'Pelapor', width: 'minmax(0,0.8fr)', cell: (p) => <span className="truncate">{p.pelapor ?? '-'}</span> },
    { key: 'tanggal', header: 'Dilaporkan', width: '150px', cell: (p) => <span className="truncate">{tglJam(p.tanggal_lapor, p.lapor_at)}</span> },
    {
      key: 'menunggu', header: 'Menunggu', width: '100px', align: 'center',
      cell: (p) => {
        if (p.status !== 'dilaporkan') return <span className="text-ink-muted">-</span>;
        const hari = hariSejak(p.tanggal_lapor);
        return <Badge dot={hari > BATAS_HARI ? 'bg-danger' : 'bg-warn'}>{hari === 0 ? 'Hari ini' : `${hari} hari`}</Badge>;
      },
    },
    {
      key: 'aksi', header: 'Aksi', width: tab === 'menunggu' ? '200px' : '90px', align: 'right',
      cell: (p) => (
        <span className="flex items-center gap-1.5">
          <button type="button" className={`${btnOutline} !h-8 !px-3`} onClick={() => openDetail(p)}>Detail</button>
          {p.status === 'dilaporkan' && (
            <button type="button" className={`${btnSolid} !h-8 !px-3`} onClick={() => openTerima(p)}>Terima laporan</button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Penanganan Inventory</h1>
          <p className="max-w-xl text-xs text-ink-soft">
            Monitoring antrean perbaikan, verifikasi laporan kerusakan, dan riwayat penanganan unit inventory.
          </p>
          {terlambat !== null && (
            <Badge dot={terlambat > 0 ? 'bg-danger' : 'bg-success'}>
              {terlambat > 0 ? `${terlambat} laporan belum diterima lewat ${BATAS_HARI} hari` : `Tidak ada laporan yang lewat ${BATAS_HARI} hari.`}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <SegmentedTabs tabs={TAB_PENANGANAN} value={tab} onChange={changeTab} />

        <div className="flex flex-wrap gap-3">
          <div className="min-w-64 flex-1">
            <SearchField value={query} onChange={setQuery} placeholder="Cari kode inventory, nama barang, keluhan, pelapor..." />
          </div>
          <div className="w-full sm:w-64">
            <ComboBox
              options={JENIS_OPTIONS}
              value={jenis}
              onChange={(v) => { setJenis(v); setPage(1); }}
              placeholder="Semua Jenis Kerusakan"
              searchable={false}
              clearable
            />
          </div>
        </div>

        {/* counter data */}
        <p className="text-[11px] text-ink-muted">
          Total {label}:{' '}
          {loading ? (
            <Loader2 size={12} className="inline animate-spin align-middle" />
          ) : (
            <span className="font-semibold text-ink">{total.toLocaleString('id-ID')}</span>
          )}
        </p>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(p) => p.id}
          loading={loading}
          emptyText={error || (tab === 'menunggu' ? 'Tidak ada laporan yang menunggu verifikasi.' : 'Belum ada data.')}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <PenangananDetailModal open={detailOpen} penanganan={detailTarget} onClose={() => setDetailOpen(false)} />

      <PenangananTerimaModal
        open={terimaOpen}
        penanganan={terimaTarget}
        onClose={() => setTerimaOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}