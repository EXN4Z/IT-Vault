import { useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import { btnOutline, btnSolid } from '../../../components/ui/buttonStyles';
import { inventoryService } from '../../../services/inventoryService';
import { getErrorMessage } from '../../../lib/errors';
import type { InventoryRow } from '../../../types/inventory';

interface InventoryJualModalProps {
  open: boolean;
  inventory: InventoryRow | null; // barang yang dijual (target tidak di-null-kan saat tutup supaya isi modal tidak berubah selama animasi)
  onClose: () => void;
  onSaved: () => void; // dipanggil begitu berhasil dijual (untuk memuat ulang tabel)
}

// modal konfirmasi "Jual Inventory": hanya Rusak Berat tanpa kelengkapan yang masih nempel (server yang memutuskan).
// Setelah dijual datanya tetap ada tapi terkunci, dan tidak bisa dibatalkan.
export default function InventoryJualModal({ open, inventory, onClose, onSaved }: InventoryJualModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);

  // tiap modal dibuka: hapus pesan error sebelumnya
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setError('');
  }

  const confirm = async () => {
    if (!inventory || saving) return;
    setSaving(true);
    setError('');
    try {
      await inventoryService.jual(inventory.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title="Jual inventory"
      size="sm"
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>Batal</button>
          <button type="button" className={btnSolid} onClick={confirm} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
            Jual
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink">{inventory?.kode_inventory}</span>
        {inventory?.nama ? ` (${inventory.nama})` : ''} akan ditandai sebagai Dijual.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Datanya tetap tersimpan, tapi tidak bisa diubah, dihapus, atau di-link lagi, dan penjualan ini tidak bisa dibatalkan.
      </p>
      {error && <p className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}
    </Modal>
  );
}