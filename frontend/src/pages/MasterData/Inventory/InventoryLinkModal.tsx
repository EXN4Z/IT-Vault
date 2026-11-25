import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import SearchField from '../../../components/ui/SearchField';
import Badge from '../../../components/ui/Badge';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { inventoryService } from '../../../services/inventoryService';
import { getErrorMessage } from '../../../lib/errors';
import { INVENTORY_STATUSES } from '../../../types/inventory';
import type { InventoryLinkCandidate, InventoryRow } from '../../../types/inventory';
import Tooltip from '../../../components/ui/Tooltip';

interface InventoryLinkModalProps {
  open: boolean;
  inventory: InventoryRow | null; // inventory yang mau di-link / dilepas
  onClose: () => void;
  onDone: () => void; // dipanggil setelah berhasil link atau lepas link
}

// modal link, satu modal untuk dua mode (ditentukan dari inventory-nya):
// - belum punya barang utama -> mode "Link ke barang utama": cari, pilih satu inventory, klik Link
// - sudah jadi kelengkapan   -> mode "Lepas link": konfirmasi lalu klik Lepas
// daftar pilihan barang utama sudah disaring server: tanpa dirinya sendiri dan tanpa inventory yang sudah jadi kelengkapan
export default function InventoryLinkModal({ open, inventory, onClose, onDone }: InventoryLinkModalProps) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // isi kolom cari yang dikirim ke server (ditunda)
  const [items, setItems] = useState<InventoryLinkCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null); // barang utama yang dipilih (belum disimpan)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);

  const isUnlink = inventory?.parent_id != null;

  // tiap modal dibuka: kosongkan pencarian, pilihan, dan error
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setSearch('');
      setItems([]);
      setSelectedId(null);
      setError('');
    }
  }

  // tunda pencarian 300ms setelah berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // mode link: ambil pilihan barang utama saat modal dibuka atau pencarian berganti
  useEffect(() => {
    if (!open || !inventory || isUnlink) return;
    let ignore = false;
    setLoading(true);
    inventoryService
      .linkCandidates(inventory.id, search)
      .then((res) => { if (!ignore) setItems(res); })
      .catch((err) => { if (!ignore) setError(getErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [open, inventory, isUnlink, search]);

  const submit = async () => {
    if (!inventory || saving) return;
    if (!isUnlink && selectedId === null) return;
    setSaving(true);
    setError('');
    try {
      if (isUnlink) await inventoryService.unlink(inventory.id);
      else await inventoryService.link(inventory.id, selectedId!);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const nameLabel = inventory ? `${inventory.kode_inventory}${inventory.nama ? ` (${inventory.nama})` : ''}` : '';

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title={isUnlink ? 'Hapus sebagai kelengkapan' : 'Jadikan kelengkapan barang utama'}
      description={!isUnlink && inventory ? `Pilih barang utama untuk ${nameLabel}.` : undefined}
      size={isUnlink ? 'sm' : 'md'}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="button" className={btnSolid} onClick={submit} disabled={saving || (!isUnlink && selectedId === null)}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isUnlink ? 'Lepas' : 'Link'}
          </button>
        </>
      }
    >
      {isUnlink ? (
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{inventory?.kode_inventory}</span>
          {inventory?.nama ? ` (${inventory.nama})` : ''} akan dilepas dari barang utamanya{' '}
          <span className="font-semibold text-ink">{inventory?.parent?.kode_inventory}</span>.
        </p>
      ) : (
        <div className="space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder="Cari kode, nama, kategori, merk, type, serial number, atau pemakai..." />

          <div className="max-h-[320px] divide-y divide-line/60 overflow-y-auto rounded-lg border border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <p className="px-3 py-8 text-center text-xs text-ink-muted">Memuat data…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-ink-muted">Tidak ada inventory yang bisa dijadikan barang utama.</p>
            ) : (
            items.map((p) => {
                const selected = p.id === selectedId;
                const rusakBerat = p.status === 'rusak_berat';
                const st = INVENTORY_STATUSES.find((x) => x.key === p.status);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={saving || rusakBerat}
                    aria-pressed={selected}
                    title={rusakBerat ? 'Inventory rusak berat tidak bisa dijadikan barang utama' : undefined}
                    onClick={() => setSelectedId(selected ? null : p.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      rusakBerat || saving ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-hover'
                    } ${saving ? 'opacity-60' : ''} ${selected ? 'bg-hover' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <Tooltip onlyWhenTruncated className={`block truncate text-xs font-semibold ${rusakBerat ? 'opacity-60' : ''}`}>
                        {p.kode_inventory}{p.nama ? ` - ${p.nama}` : ''}
                      </Tooltip>
                      <Tooltip onlyWhenTruncated className={`block truncate text-[11px] text-ink-muted ${rusakBerat ? 'opacity-60' : ''}`}>
                        {[p.kategori?.nama, [p.merk, p.type].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || '-'}
                        {p.pemakai_saat_ini ? ` · ${p.pemakai_saat_ini.name}` : ''}
                      </Tooltip>
                      {rusakBerat && (
                        <span className="block truncate text-[11px] font-medium text-danger">
                          Rusak berat, tidak bisa dijadikan barang utama
                        </span>
                      )}
                    </span>
                    {p.children_count > 0 && (
                      <span className="shrink-0 text-[11px] text-ink-muted">{p.children_count} kelengkapan</span>
                    )}
                    <span className="shrink-0">
                      <Badge dot={st?.dot ?? 'bg-ink-muted'}>{st?.label ?? p.status}</Badge>
                    </span>
                    {selected && <Check size={14} className="shrink-0 text-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}
    </Modal>
  );
}