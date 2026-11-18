import { useSearchParams } from 'react-router-dom';
import { Images } from 'lucide-react';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import FotoInventoryPage from './FotoInventory/FotoInventoryPage';

const TABS = [
  { key: 'foto-inventory', label: 'Foto Inventory', icon: Images },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function LaporanPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'foto-inventory';

  return (
    <div className="space-y-4">
      <div className="border-b border-line">
        <SegmentedTabs size="md" tabs={TABS} value={tab} onChange={(key) => setParams({ tab: key })} />
      </div>

      {tab === 'foto-inventory' && <FotoInventoryPage />}
    </div>
  );
}