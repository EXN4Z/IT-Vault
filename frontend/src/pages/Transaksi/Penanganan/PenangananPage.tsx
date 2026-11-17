import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, Download, Eye, Inbox, Loader2, Printer, Upload } from 'lucide-react';
import DataTable, { type Column } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import SearchField from '../../../components/ui/SearchField';
import SegmentedTabs from '../../../components/ui/SegmentedTabs';
import ImportModal from '../../../components/modal/ImportModal';
import ExportModal, { type ExportColumn, type ExportOptions } from '../../../components/modal/ExportModal';
import { ComboBox } from '../../../components/form';
import { btnOutline } from '../../../components/ui/buttonStyles';
import { penangananService } from '../../../services/penangananService';
import { transferService } from '../../../services/transferService';
import { getErrorList, getErrorMessage } from '../../../lib/errors';
import { saveBlob } from '../../../lib/downloadExport';
import { openReceiptWindow, writePenangananReceipt } from '../../../lib/receipt';
import { formatDurasi, rupiah, tglJam } from '../../../lib/waktu';
import PenangananDetailModal from './PenangananDetailModal';
import PenangananSelesaiModal from './PenangananSelesaiModal';
import PenangananTerimaModal from './PenangananTerimaModal';
import { JENIS_KERUSAKAN, TAB_PENANGANAN, type Penanganan, type TabPenanganan } from '../../../types/penanganan';

const PER_PAGE = 10;
const BATAS_HARI = 7; // laporan yang belum diterima lebih dari ini ditandai terlambat

// tombol ikon di kolom Aksi (sama dengan halaman Inventory)
const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink';

// kolom yang bisa dipilih di modal export (nanti harus sama dengan COLUMNS di export backend)
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'kode', label: 'Kode Inventory' },
  { key: 'nama', label: 'Nama Barang' },
  { key: 'jenis', label: 'Jenis Kerusakan' },
  { key: 'keluhan', label: 'Keluhan' },
  { key: 'pelapor', label: 'Pelapor' },
  { key: 'penerima', label: 'Penerima' },
  { key: 'tanggal_lapor', label: 'Tanggal Lapor' },
  { key: 'tanggal_diterima', label: 'Tanggal Diterima' },
  { key: 'tanggal_selesai', label: 'Tanggal Selesai' },
  { key: 'harga_jasa', label: 'Harga Jasa' },
  { key: 'biaya_komponen', label: 'Biaya Komponen' },
  { key: 'total_biaya', label: 'Total Biaya' },
  { key: 'no_struk', label: 'No. Struk' },
  { key: 'catatan', label: 'Catatan' },
];

const JENIS_OPTIONS = JENIS_KERUSAKAN.map((j) => ({ value: j.key, label: j.label }));

// selisih hari kalender antara tanggal lapor ('YYYY-MM-DD') dan hari ini
function hariSejak(tanggal: string): number {
  const [y, m, d] = tanggal.split('-').map(Number);
  const lapor = new Date(y, m - 1, d);
  const now = new Date();
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((hariIni.getTime() - lapor.getTime()) / 86_400_000));
}

// total biaya perbaikan (harga jasa + biaya komponen), server mengirim decimal sebagai string
// (null kalau keduanya kosong, mis. rusak berat tanpa biaya)
const totalBiaya = (p: Penanganan) => (p.harga_jasa === null && p.biaya_komponen === null ? null : Number(p.harga_jasa ?? 0) + Number(p.biaya_komponen ?? 0));

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

  // modal selesaikan perbaikan (target tidak di-null-kan saat tutup, alasannya sama)
  const [selesaiOpen, setSelesaiOpen] = useState(false);
  const [selesaiTarget, setSelesaiTarget] = useState<Penanganan | null>(null);

  // import / export (hanya di tab Berhasil Diperbaiki dan Rusak Berat)
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDetails, setImportDetails] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [notice, setNotice] = useState(''); // pesan di atas tabel (mis. popup struk diblokir)

  const openSelesai = (p: Penanganan) => {
    setSelesaiTarget(p);
    setSelesaiOpen(true);
  };

  // cetak ulang struk: datanya sudah ada di baris, tidak perlu request. Jendela dibuka langsung di klik.
  const cetakStruk = (p: Penanganan) => {
    const win = openReceiptWindow();
    if (!win) {
      setNotice('Jendela struk diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.');
      return;
    }
    setNotice('');
    writePenangananReceipt(win, p);
  };

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

  const bisaTransfer = tab === 'berhasil' || tab === 'rusak_berat';

  const openExport = () => {
    setExportError('');
    setExportOpen(true);
  };

  const handleExport = async (opts: ExportOptions) => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await transferService.export('/penanganan', {
        format: opts.format,
        scope: opts.scope,
        columns: opts.columns,
        status: tab, // export selalu sesuai tab yang sedang dibuka
        jenis: opts.scope === 'all' ? undefined : jenis || undefined,
        search: opts.scope === 'all' ? undefined : search || undefined,
        page: opts.scope === 'page' ? page : undefined,
        per_page: opts.scope === 'page' ? PER_PAGE : undefined,
      });
      saveBlob(blob, `penanganan-${tab}-${new Date().toLocaleDateString('sv-SE')}.${opts.format}`);
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
      await transferService.import('/penanganan', file);
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

  // kolom: sebagian dipakai bersama, sisanya beda per tab
  const fotoCol: Column<Penanganan> = {
    key: 'foto', header: 'Foto', width: '56px',
    cell: (p) => (
      <a href={p.foto_url} target="_blank" rel="noreferrer" title="Lihat foto kerusakan">
        <img src={p.foto_url} alt="Foto kerusakan" className="size-9 rounded-md border border-line object-cover" />
      </a>
    ),
  };
  const kodeCol: Column<Penanganan> = { key: 'kode', header: 'Kode', width: '105px', cell: (p) => <span className="truncate font-semibold">{p.inventory?.kode_inventory ?? '-'}</span> };
  const namaCol: Column<Penanganan> = { key: 'nama', header: 'Nama Barang', width: 'minmax(100px,1fr)', cell: (p) => <span className="truncate font-semibold">{p.inventory?.nama ?? '-'}</span> };
  const jenisCol: Column<Penanganan> = { key: 'jenis', header: 'Jenis', width: '115px', cell: (p) => <span className="truncate">{p.jenis_label}</span> };
  const keluhanCol: Column<Penanganan> = { key: 'keluhan', header: 'Keluhan', width: 'minmax(100px,1.4fr)', cell: (p) => <span className="truncate text-ink-soft" title={p.keluhan}>{p.keluhan}</span> };
  const pelaporCol: Column<Penanganan> = { key: 'pelapor', header: 'Pelapor', width: 'minmax(70px,0.8fr)', cell: (p) => <span className="truncate">{p.pelapor ?? '-'}</span> };
  const laporCol: Column<Penanganan> = { key: 'tanggal', header: 'Dilaporkan', width: '135px', cell: (p) => <span className="truncate">{tglJam(p.tanggal_lapor, p.lapor_at)}</span> };
  const menungguCol: Column<Penanganan> = {
    key: 'menunggu', header: 'Menunggu', width: '85px', align: 'center',
    cell: (p) => {
      const hari = hariSejak(p.tanggal_lapor);
      return <Badge dot={hari > BATAS_HARI ? 'bg-danger' : 'bg-warn'}>{hari === 0 ? 'Hari ini' : `${hari} hari`}</Badge>;
    },
  };
  const diterimaCol: Column<Penanganan> = { key: 'diterima', header: 'Diterima', width: '135px', cell: (p) => <span className="truncate">{tglJam(p.tanggal_diterima, p.diterima_at)}</span> };
  const selesaiCol: Column<Penanganan> = { key: 'selesai', header: 'Selesai', width: '135px', cell: (p) => <span className="truncate">{tglJam(p.tanggal_selesai, p.selesai_at)}</span> };
  const durasiCol: Column<Penanganan> = {
    key: 'durasi', header: 'Durasi', width: '110px', align: 'center',
    cell: (p) => (p.diterima_at && p.selesai_at ? <span>{formatDurasi(p.diterima_at, p.selesai_at)}</span> : <span className="text-ink-muted">-</span>),
  };
  const biayaCol: Column<Penanganan> = { key: 'biaya', header: 'Total Biaya', width: '105px', align: 'right', cell: (p) => <span className="truncate font-semibold">{rupiah(totalBiaya(p))}</span> };
  const catatanCol: Column<Penanganan> = { key: 'catatan', header: 'Alasan', width: 'minmax(100px,1.4fr)', cell: (p) => <span className="truncate text-ink-soft" title={p.catatan ?? ''}>{p.catatan ?? '-'}</span> };
  const aksiCol: Column<Penanganan> = {
    key: 'aksi', header: 'Aksi', width: '90px', align: 'right',
    cell: (p) => (
      <span className="flex items-center gap-0.5">
        {p.status === 'dilaporkan' && (
          <button type="button" aria-label="Terima laporan" title="Terima laporan" className={`${iconBtn} hover:text-accent`} onClick={() => openTerima(p)}><Inbox size={14} /></button>
        )}
        {p.status === 'diterima' && (
          <button type="button" aria-label="Selesaikan" title="Selesaikan perbaikan" className={`${iconBtn} hover:text-success`} onClick={() => openSelesai(p)}><CircleCheck size={14} /></button>
        )}
        {p.status === 'selesai' && p.no_struk && (
          <button type="button" aria-label="Cetak struk" title="Cetak struk" className={iconBtn} onClick={() => cetakStruk(p)}><Printer size={14} /></button>
        )}
        <button type="button" aria-label="Detail" title="Detail" className={iconBtn} onClick={() => openDetail(p)}><Eye size={14} /></button>
      </span>
    ),
  };

  const columns: Column<Penanganan>[] =
    tab === 'menunggu' ? [fotoCol, kodeCol, namaCol, jenisCol, keluhanCol, pelaporCol, laporCol, menungguCol, aksiCol]
    : tab === 'diproses' ? [fotoCol, kodeCol, namaCol, jenisCol, keluhanCol, pelaporCol, diterimaCol, aksiCol]
    : tab === 'berhasil' ? [fotoCol, kodeCol, namaCol, jenisCol, selesaiCol, durasiCol, biayaCol, aksiCol]
    : [fotoCol, kodeCol, namaCol, jenisCol, selesaiCol, catatanCol, biayaCol, aksiCol]; // rusak_berat

  // lebar minimum isi tabel per tab (jumlah lebar kolom + jarak): kalau layar lebih sempit, tabel bisa digeser, kolom tidak saling tindih
  const minWidthByTab: Record<TabPenanganan, number> = { menunggu: 985, diproses: 890, berhasil: 930, rusak_berat: 920 };

  const emptyByTab: Record<TabPenanganan, string> = {
    menunggu: 'Tidak ada laporan yang menunggu verifikasi.',
    diproses: 'Tidak ada barang yang sedang diperbaiki.',
    berhasil: 'Belum ada perbaikan yang berhasil.',
    rusak_berat: 'Belum ada barang yang dinyatakan rusak berat.',
  };

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
        {bisaTransfer && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnOutline} onClick={openExport}><Download size={14} />Export Excel</button>
            <button type="button" className={btnOutline} onClick={openImport}><Upload size={14} />Import Excel</button>
          </div>
        )}
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

        {notice && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{notice}</p>}

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(p) => p.id}
          loading={loading}
          minWidth={minWidthByTab[tab]}
          emptyText={error || emptyByTab[tab]}
          pagination={{ page, pageCount, onPageChange: setPage }}
        />
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import penanganan"
        description={`Unggah file Excel/CSV data penanganan (${label}).`}
        requiredColumns={['Kode Inventory']}
        onSubmit={handleImport}
        loading={importing}
        error={importError}
        details={importDetails}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export penanganan"
        description={`Pilih format dan data tab ${label} yang ingin diunduh.`}
        columns={EXPORT_COLUMNS}
        total={total}
        loading={exporting}
        error={exportError}
        onSubmit={handleExport}
      />

      <PenangananDetailModal open={detailOpen} penanganan={detailTarget} onClose={() => setDetailOpen(false)} />

      <PenangananSelesaiModal
        open={selesaiOpen}
        penanganan={selesaiTarget}
        onClose={() => setSelesaiOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <PenangananTerimaModal
        open={terimaOpen}
        penanganan={terimaTarget}
        onClose={() => setTerimaOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}