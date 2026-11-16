import { useEffect, useState, type ReactNode } from 'react';
import { Eye, HandHelping, ImageOff, Link2, Loader2, Printer, RotateCcw, Tag, Unlink, Wrench } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import Badge from '../../../components/ui/Badge';
import { btnOutline } from '../../../components/ui/buttonStyles';
import { peminjamanService } from '../../../services/peminjamanService';
import { penangananService } from '../../../services/penangananService';
import { getErrorMessage } from '../../../lib/errors';
import { formatTanggal, openReceiptWindow, writePengembalianReceipt } from '../../../lib/receipt';
import { INVENTORY_STATUSES, type InventoryRow } from '../../../types/inventory';
import type { RiwayatRow } from '../../../types/peminjaman';
import { HASIL_PENANGANAN, STATUS_PENANGANAN, type Penanganan } from '../../../types/penanganan';

interface InventoryDetailModalProps {
  open: boolean;
  inventory: InventoryRow | null;
  onClose: () => void;
  // tombol aksi: detail ditutup dulu, baru modal aksinya dibuka oleh halaman
  onHandover: (row: InventoryRow) => void;
  onReturn: (row: InventoryRow) => void;
  onLink: (row: InventoryRow) => void;
  onReport: (row: InventoryRow) => void;
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-ink-muted';
const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40';

// 'YYYY-MM-DD' (atau datetime) -> '1 Jul 2026', kosong -> '-'
const tgl = (v: string | null | undefined) => (v ? formatTanggal(v.slice(0, 10)) : '-');

// tanggal + jam: 'YYYY-MM-DD' dipakai untuk tanggalnya, ISO 8601 dari server untuk jamnya (zona waktu browser)
function tglJam(tanggal: string | null, waktu: string | null): string {
  if (!tanggal) return '-';
  if (!waktu) return tgl(tanggal);
  const jam = new Date(waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  return `${tgl(tanggal)}, ${jam}`;
}

// 150000 / '150000.00' -> 'Rp 150.000', kosong -> '-'
const rupiah = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '-' : `Rp ${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

// satu baris label (kiri) + nilai (kanan), dengan garis di atasnya
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-2.5 text-xs">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">{children}</dd>
    </div>
  );
}

// modal "Detail inventory": info barang, aksi cepat, pengadaan, riwayat pemakai & peminjaman, riwayat perbaikan
export default function InventoryDetailModal({ open, inventory, onClose, onHandover, onReturn, onLink, onReport }: InventoryDetailModalProps) {
  const [rows, setRows] = useState<RiwayatRow[] | null>(null);
  const [perbaikan, setPerbaikan] = useState<Penanganan[] | null>(null);
  const [perbaikanError, setPerbaikanError] = useState('');
  const [error, setError] = useState('');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // muat riwayat tiap modal dibuka
  useEffect(() => {
    if (!open || !inventory) return;
    let ignore = false;
    setRows(null);
    setError('');
    setExpandedId(null);
    peminjamanService
      .riwayat(inventory.id)
      .then((res) => { if (!ignore) setRows(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, inventory]);

  // muat riwayat perbaikan & kerusakan tiap modal dibuka
  useEffect(() => {
    if (!open || !inventory) return;
    let ignore = false;
    setPerbaikan(null);
    setPerbaikanError('');
    penangananService
      .riwayat(inventory.id)
      .then((res) => { if (!ignore) setPerbaikan(res); })
      .catch((err) => { if (!ignore) setPerbaikanError(getErrorMessage(err)); });
    return () => { ignore = true; };
  }, [open, inventory]);

  const printReturn = async (row: RiwayatRow) => {
    if (printingId !== null) return;
    setError('');
    setPrintingId(row.id);
    // jendela struk dibuka sekarang (masih di dalam klik), kalau nanti dibuka setelah await diblokir browser
    const win = openReceiptWindow();
    try {
      const receipt = await peminjamanService.strukPengembalian(row.peminjaman_id);
      if (win) writePengembalianReceipt(win, receipt);
      else setError('Jendela struk diblokir browser. Izinkan popup untuk halaman ini, lalu coba lagi.');
    } catch (err) {
      win?.close();
      setError(getErrorMessage(err));
    } finally {
      setPrintingId(null);
    }
  };

  // tutup detail dulu, lalu minta halaman membuka modal aksi
  const act = (fn: (row: InventoryRow) => void) => {
    if (!inventory) return;
    onClose();
    fn(inventory);
  };

  const status = inventory ? INVENTORY_STATUSES.find((s) => s.key === inventory.status) : undefined;
  const isChild = inventory?.parent_id != null;
  const isParent = (inventory?.children_count ?? 0) > 0;
  const canHandover = !!inventory && !isChild && inventory.status === 'tersedia';
  const canReturn = !!inventory && !isChild && inventory.status === 'dipinjam';
  // tersedia maupun dipinjam boleh dilaporkan; status lain berarti sudah dilaporkan / diperbaiki / rusak berat / dijual
  const canReport = !!inventory && (inventory.status === 'tersedia' || inventory.status === 'dipinjam');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={inventory?.nama ?? inventory?.kode_inventory ?? 'Detail inventory'}
      eyebrow={inventory ? [inventory.kode_inventory, inventory.kategori?.nama].filter(Boolean).join(' · ') : undefined}
      titleExtra={inventory && <Badge dot={status?.dot ?? 'bg-ink-muted'}>{status?.label ?? inventory.status}</Badge>}
      size="lg"
      footer={<button type="button" className={btnOutline} onClick={onClose}>Tutup</button>}
    >
      {inventory && (
        <div className="flex flex-col gap-5">
          {/* foto + info utama */}
          <div className="flex gap-4">
            <div className="grid min-h-36 w-36 shrink-0 place-items-center self-stretch rounded-lg border border-line text-ink-muted">
              <span className="flex flex-col items-center gap-2 text-xs font-medium">
                <ImageOff size={28} />
                Tanpa Foto
              </span>
            </div>
            <dl className="min-w-0 flex-1">
              <InfoRow label="Merk & Tipe">{[inventory.merk, inventory.type].filter(Boolean).join(' · ') || '-'}</InfoRow>
              <InfoRow label="Serial Number">{inventory.serial_number ?? '-'}</InfoRow>
              <InfoRow label="Warna & Unit">{`${inventory.warna ?? '-'} · ${inventory.jumlah} unit`}</InfoRow>
              <InfoRow label="Garansi berakhir">{tgl(inventory.tanggal_garansi)}</InfoRow>
            </dl>
          </div>

          {/* aksi cepat */}
          <div className="flex flex-wrap gap-2">
            {canReturn ? (
              <button type="button" className={`${btnOutline} !border-transparent !bg-accent !text-canvas hover:opacity-90`} onClick={() => act(onReturn)}>
                <RotateCcw size={14} />Kembalikan
              </button>
            ) : (
              <button
                type="button"
                className={`${btnOutline} !border-transparent !bg-accent !text-canvas hover:opacity-90`}
                disabled={!canHandover}
                title={
                  isChild ? 'Kelengkapan ikut diserahkan bersama barang utamanya'
                    : inventory.status !== 'tersedia' ? 'Hanya inventory berstatus Tersedia yang bisa diserahkan'
                      : undefined
                }
                onClick={() => act(onHandover)}
              >
                <HandHelping size={14} />Serahkan ke Karyawan
              </button>
            )}

            <button
              type="button"
              className={`${btnOutline} !border-warn/60 !text-warn`}
              disabled={!canReport}
              title={!canReport ? 'Hanya inventory berstatus Tersedia atau Dipinjam yang bisa dilaporkan' : undefined}
              onClick={() => act(onReport)}
            >
              <Wrench size={14} />Lapor Kerusakan
            </button>

            <button
              type="button"
              className={btnOutline}
              disabled={!isChild && isParent}
              title={!isChild && isParent ? 'Sudah jadi barang utama, tidak bisa di-link ke inventory lain' : undefined}
              onClick={() => act(onLink)}
            >
              {isChild ? <Unlink size={14} /> : <Link2 size={14} />}
              {isChild ? 'Lepas dari Induk' : 'Pasang ke Induk'}
            </button>

            <button type="button" className={btnOutline} disabled title="Belum tersedia">
              <Tag size={14} />Jual Inventory
            </button>
          </div>

          {/* pengadaan & lokasi */}
          <section>
            <h3 className={`${sectionTitle} mb-1`}>Pengadaan &amp; Lokasi</h3>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <InfoRow label="Perusahaan">{inventory.perusahaan?.nama ?? '-'}</InfoRow>
              <InfoRow label="Supplier">{inventory.supplier?.nama ?? '-'}</InfoRow>
              <InfoRow label="Surat Jalan / GR">{`${inventory.no_surat_jalan ?? '-'} / ${inventory.no_good_receive ?? '-'}`}</InfoRow>
              <InfoRow label="Tanggal pembelian">{tgl(inventory.tanggal_invoice)}</InfoRow>
              <InfoRow label="Tanggal input">{tgl(inventory.tanggal_input)}</InfoRow>
              <InfoRow label="Catatan">{inventory.keterangan ?? '-'}</InfoRow>
            </dl>
          </section>

          {/* riwayat pemakai & peminjaman */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className={sectionTitle}>Riwayat Pemakai &amp; Peminjaman</h3>
              {rows && <span className="text-[11px] text-ink-muted">{rows.length} catatan</span>}
            </div>

            {error && <p className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}

            {rows === null && !error && (
              <p className="flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-muted"><Loader2 size={14} className="animate-spin" />Memuat riwayat…</p>
            )}

            {rows?.length === 0 && <p className="border-t border-line pt-3 text-xs italic text-ink-muted">Belum pernah dipinjam.</p>}

            <ul>
              {rows?.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <li key={r.id} className="border-t border-line py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1">
                        <span className="font-semibold uppercase text-ink">{r.peminjam ?? '-'}</span>
                        <span className="text-ink-soft">
                          {' '}— {tglJam(r.tanggal_penerimaan, r.waktu_penerimaan)} s/d {r.tanggal_pengembalian ? tglJam(r.tanggal_pengembalian, r.waktu_pengembalian) : 'sekarang'}
                        </span>
                        {r.peran === 'kelengkapan' && <span className="text-ink-muted"> (kelengkapan)</span>}
                      </p>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {r.bisa_cetak_pengembalian && (
                          <button
                            type="button"
                            aria-label="Cetak struk pengembalian"
                            title="Cetak struk pengembalian"
                            className={iconBtn}
                            disabled={printingId !== null}
                            onClick={() => printReturn(r)}
                          >
                            {printingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Lihat detail peminjaman"
                          title="Lihat detail peminjaman"
                          aria-pressed={expanded}
                          className={`${iconBtn} ${expanded ? 'bg-hover text-ink' : ''}`}
                          onClick={() => setExpandedId(expanded ? null : r.id)}
                        >
                          <Eye size={14} />
                        </button>
                      </span>
                    </div>

                    {expanded && (
                      <dl className="mt-2 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 rounded-lg bg-hover px-3 py-2.5 text-ink-soft">
                        <dt>No. penerimaan</dt>
                        <dd className="text-ink">{r.nomor_penerimaan}</dd>

                        <dt>Status</dt>
                        <dd className="text-ink">{r.berjalan ? 'Sedang dipinjam' : 'Selesai'}</dd>

                        {r.induk && (
                          <>
                            <dt>Barang utama</dt>
                            <dd className="text-ink">{r.induk.kode_inventory}{r.induk.nama ? ` - ${r.induk.nama}` : ''}</dd>
                          </>
                        )}

                        {r.keterangan && (
                          <>
                            <dt>Keterangan</dt>
                            <dd className="text-ink">{r.keterangan}</dd>
                          </>
                        )}

                        {r.catatan_kembali && (
                          <>
                            <dt>Catatan kembali</dt>
                            <dd className="text-ink">{r.catatan_kembali}</dd>
                          </>
                        )}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* riwayat perbaikan & kerusakan */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className={sectionTitle}>Riwayat Perbaikan &amp; Kerusakan</h3>
              {perbaikan && <span className="text-[11px] text-ink-muted">{perbaikan.length} catatan</span>}
            </div>

            {perbaikanError && <p className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{perbaikanError}</p>}

            {perbaikan === null && !perbaikanError && (
              <p className="flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-muted"><Loader2 size={14} className="animate-spin" />Memuat riwayat…</p>
            )}

            {perbaikan?.length === 0 && <p className="border-t border-line pt-3 text-xs italic text-ink-muted">Belum ada riwayat perbaikan.</p>}

            <ul>
              {perbaikan?.map((p) => {
                const st = STATUS_PENANGANAN.find((x) => x.key === p.status);
                const hasil = HASIL_PENANGANAN.find((h) => h.key === p.hasil)?.label;
                return (
                  <li key={p.id} className="flex gap-3 border-t border-line py-2.5 text-xs">
                    <a href={p.foto_url} target="_blank" rel="noreferrer" className="shrink-0" title="Lihat foto kerusakan">
                      <img src={p.foto_url} alt="Foto kerusakan" className="size-14 rounded-lg border border-line object-cover" />
                    </a>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{p.jenis_label}</span>
                        <Badge dot={st?.dot ?? 'bg-ink-muted'}>{st?.label ?? p.status}</Badge>
                      </p>
                      <p className="text-ink-soft">{p.keluhan}</p>
                      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-0.5 text-ink-soft">
                        <dt>Dilaporkan</dt>
                        <dd className="text-ink">{tglJam(p.tanggal_lapor, p.lapor_at)}{p.pelapor ? ` · ${p.pelapor}` : ''}</dd>

                        {p.tanggal_diterima && (
                          <>
                            <dt>Diterima</dt>
                            <dd className="text-ink">{tglJam(p.tanggal_diterima, p.diterima_at)}{p.penerima ? ` · ${p.penerima}` : ''}</dd>
                          </>
                        )}

                        {p.no_struk && (
                          <>
                            <dt>No. struk</dt>
                            <dd className="text-ink">{p.no_struk}</dd>
                          </>
                        )}

                        {p.tanggal_selesai && (
                          <>
                            <dt>Selesai</dt>
                            <dd className="text-ink">{tglJam(p.tanggal_selesai, p.selesai_at)}{hasil ? ` · ${hasil}` : ''}</dd>
                            <dt>Biaya</dt>
                            <dd className="text-ink">Jasa {rupiah(p.harga_jasa)} · Komponen {rupiah(p.biaya_komponen)}</dd>
                          </>
                        )}

                        {p.catatan && (
                          <>
                            <dt>Catatan</dt>
                            <dd className="text-ink">{p.catatan}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}