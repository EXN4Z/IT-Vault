import {
  ArrowLeftRight,
  Database,
  LayoutDashboard,
  Package,
  Users,
  Building2,
  type LucideIcon,
  Tags,
  Truck,
  MonitorCog,
  FileBarChart2,
  Images,
  Warehouse,
  BriefcaseBusiness,
} from 'lucide-react';

// ===== tipe data menu =====

// anak menu (item di dalam dropdown)
export interface NavChild {
  label: string;
  path: string;
  icon: LucideIcon;
}

// satu menu di sidebar: punya `path` (menu biasa) ATAU `children` (dropdown)
export interface NavItem {
  label: string;
  icon: LucideIcon;
  section: 'menu' | 'sistem'; // 'menu' = grup utama, 'sistem' = grup bawah (Audit Log, Settings, dst.)
  path?: string;
  children?: NavChild[];
  matchPrefix?: string; // menu dianggap aktif kalau URL diawali prefix ini
}

// ===== daftar menu (satu-satunya tempat untuk menambah / mengubah menu) =====
export const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', section: 'menu' },

  {
    label: 'Transaksi',
    icon: ArrowLeftRight,
    section: 'menu',
    matchPrefix: '/transaksi',
    children: [
      { label: 'Penanganan Inventory', path: '/transaksi/penanganan', icon: MonitorCog },
    ],
  },

  {
    label: 'Laporan',
    icon: FileBarChart2,
    section: 'menu',
    matchPrefix: '/laporan',
    children: [
      { label: 'Foto Inventory', path: '/laporan?tab=foto-inventory', icon: Images },
    ],
  },

  {
    label: 'Master Data',
    icon: Database,
    section: 'menu',
    matchPrefix: '/master-data',
    children: [
      // path boleh pakai query (?tab=...); route yang didaftarin di App.tsx cuma /master-data
      { label: 'Inventory', path: '/master-data?tab=inventory', icon: Package },
      { label: 'Kategori', path: '/master-data?tab=kategori', icon: Tags },
      { label: 'Supplier', path: '/master-data?tab=supplier', icon: Truck },
      { label: 'Data User', path: '/master-data?tab=data-user', icon: Users },
      { label: 'Perusahaan', path: '/master-data?tab=perusahaan', icon: Building2 },
      { label: 'Departemen', path: '/master-data?tab=departemen', icon: BriefcaseBusiness },
      { label: 'Cabang', path: '/master-data?tab=cabang', icon: Warehouse },
    ],
  },
];

// ===== helper =====

// anak menu aktif kalau pathname sama DAN param `tab` sama (param lain seperti `role` diabaikan)
export function isChildActive(child: NavChild, pathname: string, search: string): boolean {
  const [childPath, childQuery = ''] = child.path.split('?');
  if (pathname !== childPath) return false;
  const want = new URLSearchParams(childQuery).get('tab');
  if (want === null) return true;
  return new URLSearchParams(search).get('tab') === want;
}

// apakah menu ini sedang aktif berdasarkan URL sekarang
export function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
  if (item.children) return item.children.some((c) => isChildActive(c, pathname, search));
  return item.path === pathname;
}

// breadcrumb di top bar, diturunkan dari menu yang cocok dengan URL sekarang
export function getBreadcrumb(pathname: string, search: string): { group: string; current: string } {
  for (const item of navItems) {
    const child = item.children?.find((c) => isChildActive(c, pathname, search));
    if (child) return { group: item.label, current: child.label };
    if (isItemActive(item, pathname, search)) return { group: '', current: item.label };
  }
  return { group: '', current: '' };
}