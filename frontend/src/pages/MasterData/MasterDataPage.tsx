import { useSearchParams } from 'react-router-dom';
import { BriefcaseBusiness, Building2, Package, Tags, Truck, Users, Warehouse } from 'lucide-react';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import DataUser from './DataUser/DataUser';
import CabangPage from './Cabang/CabangPage';
import DepartemenPage from './Departemen/DepartemenPage';
import KategoriPage from './Kategori/KategoriPage';
import SupplierPage from './Supplier/SupplierPage';
import InventoryPage from './Inventory/InventoryPage';
import PerusahaanPage from './Perusahaan/PerusahaanPage';

// tab utama Master Data (pindah antar halaman)
const TABS = [
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'kategori', label: 'Kategori', icon: Tags },
  { key: 'supplier', label: 'Supplier', icon: Truck },
  { key: 'data-user', label: 'Data User', icon: Users },
  { key: 'perusahaan', label: 'Perusahaan', icon: Building2 },
  { key: 'departemen', label: 'Departemen', icon: BriefcaseBusiness },
  { key: 'cabang', label: 'Cabang', icon: Warehouse },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// satu halaman /master-data, isinya ganti sesuai ?tab=
export default function MasterDataPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'data-user';

  return (
    <div className="space-y-4">
      <div className="border-b border-line">
        {/* setParams({ tab }) menimpa semua query lain, jadi filter role di Data User ikut ter-reset */}
        <SegmentedTabs size="md" tabs={TABS} value={tab} onChange={(key) => setParams({ tab: key })} />
      </div>

      {tab === 'data-user' && <DataUser />}
      {tab === 'perusahaan' && <PerusahaanPage />}
      {tab === 'departemen' && <DepartemenPage />}
      {tab === 'cabang' && <CabangPage />}
      {tab === 'kategori' && <KategoriPage />}
      {tab === 'supplier' && <SupplierPage />}
      {tab === 'inventory' && <InventoryPage />}
    </div>
  );
}