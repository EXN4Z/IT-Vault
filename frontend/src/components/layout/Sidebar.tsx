import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Vault } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isChildActive, isItemActive, navItems, type NavItem } from './navigation';

// class baris menu di panel (dipakai menu biasa, dropdown, dan anak dropdown)
const rowBase =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition cursor-pointer';
const rowActive = 'bg-ink text-canvas font-semibold';
const rowIdle = 'text-ink-soft hover:bg-hover hover:text-ink';
const childActive = 'bg-selected text-ink font-semibold';
const childIdle = 'text-ink-muted hover:bg-hover hover:text-ink';

// class judul grup ("Menu", "Sistem")
const groupLabelClass = 'px-2.5 pb-1.5 pt-3.5 text-xs font-medium text-ink-muted';

interface SidebarProps {
  panelOpen: boolean; // desktop: panel menu terbuka
  mobileOpen: boolean; // mobile: drawer terbuka
  closeMobile: () => void;
  openPanel: () => void;
}

// =============================================================================
// SIDEBAR: rail ikon (48px, selalu tampil) + panel menu (248px, bisa ditutup)
// =============================================================================
export default function Sidebar({ panelOpen, mobileOpen, closeMobile, openPanel }: SidebarProps) {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  // buka/tutup dropdown hasil klik user; kalau belum pernah diklik, ikut status aktif (URL)
  const [dropdownOverrides, setDropdownOverrides] = useState<Record<string, boolean>>({});

  const menuItems = navItems.filter((item) => item.section === 'menu');
  const systemItems = navItems.filter((item) => item.section === 'sistem');

  const isDropdownOpen = (item: NavItem) =>
    dropdownOverrides[item.label] ?? isItemActive(item, pathname, search);

  const toggleDropdown = (item: NavItem) =>
    setDropdownOverrides((prev) => ({ ...prev, [item.label]: !isDropdownOpen(item) }));

  // pindah halaman, lalu tutup drawer (khusus mobile)
  const goTo = (path: string) => {
    navigate(path);
    closeMobile();
  };

  // klik ikon di rail: dropdown -> buka panel + grupnya, menu biasa -> pindah halaman
  const handleRailClick = (item: NavItem) => {
    if (item.children) {
      openPanel();
      setDropdownOverrides((prev) => ({ ...prev, [item.label]: true }));
    } else if (item.path) {
      goTo(item.path);
    }
  };

  // ---------------------------------------------------------------------------
  // satu tombol ikon di rail
  // ---------------------------------------------------------------------------
  const renderRailButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item, pathname, search);

    return (
      <button
        key={item.label}
        type="button"
        title={item.label}
        aria-label={item.label}
        onClick={() => handleRailClick(item)}
        className={`grid size-8 place-items-center rounded-lg transition cursor-pointer ${
          active ? 'bg-selected text-ink' : 'hover:bg-hover hover:text-ink'
        }`}
      >
        <Icon size={17} />
      </button>
    );
  };

  // ---------------------------------------------------------------------------
  // satu baris menu di panel
  // ---------------------------------------------------------------------------
  const renderRow = (item: NavItem) => (
    <SidebarItem
      key={item.label}
      item={item}
      pathname={pathname}
      search={search}
      isOpen={isDropdownOpen(item)}
      onToggle={() => toggleDropdown(item)}
      onNavigate={goTo}
    />
  );

  return (
    <>
      {/* ===== scrim: lapisan gelap di belakang drawer (hanya mobile) ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex bg-canvas transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* =================================================================
            SIDEBAR RAIL: kolom ikon di paling kiri
            ================================================================= */}
        <nav
          aria-label="Menu cepat"
          className="flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-line bg-rail py-3 text-ink-muted"
        >
          {/* logo */}
          <div className="mb-2 grid size-8 place-items-center rounded-lg bg-ink text-canvas">
            <Vault size={16} />
          </div>

          {/* menu utama */}
          {menuItems.map(renderRailButton)}

          {/* pendorong: menu sistem dan tombol keluar menempel di bawah */}
          <div className="flex-1" />

          {/* menu sistem */}
          {systemItems.map(renderRailButton)}

          {/* tombol keluar */}
          <button
            type="button"
            title="Keluar"
            aria-label="Keluar"
            onClick={logout}
            className="grid size-8 place-items-center rounded-lg transition cursor-pointer hover:bg-danger-bg hover:text-danger"
          >
            <LogOut size={17} />
          </button>
        </nav>

        {/* =================================================================
            SIDEBAR PANEL: brand, daftar menu, dan footer user
            (lebar menyusut ke 0 di desktop saat ditutup)
            ================================================================= */}
        <div
          className={`w-62 overflow-hidden border-r border-line bg-canvas transition-[width] duration-200 ${
            panelOpen ? 'lg:w-62' : 'lg:w-0 lg:border-r-0'
          }`}
        >
          {/* lebar dikunci supaya teks tidak ikut berubah bentuk saat panel menyusut */}
          <div className="flex h-full w-62 flex-col">
            {/* brand */}
            <div className="px-4 pb-2.5 pt-4">
              <p className="text-sm font-bold text-ink">Marimas IT Vault</p>
              <p className="text-xs text-ink-muted">Manajemen Inventory IT</p>
            </div>

            {/* daftar menu */}
            <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-3">
              <p className={groupLabelClass}>Menu</p>
              {menuItems.map(renderRow)}

              {systemItems.length > 0 && (
                <>
                  <p className={groupLabelClass}>Sistem</p>
                  {systemItems.map(renderRow)}
                </>
              )}
            </nav>

            {/* footer: info user + tombol keluar */}
            <div className="border-t border-line p-3">
              <div className="mb-2 flex items-center gap-2.5 px-1.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger transition cursor-pointer hover:bg-danger-bg"
              >
                <LogOut size={16} />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// SIDEBAR ITEM: satu baris menu di panel (menu biasa atau dropdown)
// =============================================================================
interface SidebarItemProps {
  item: NavItem;
  pathname: string;
  search: string;
  isOpen: boolean; // khusus dropdown: daftar anak terbuka
  onToggle: () => void; // khusus dropdown: buka/tutup
  onNavigate: (path: string) => void;
}

function SidebarItem({ item, pathname, search, isOpen, onToggle, onNavigate }: SidebarItemProps) {
  const Icon = item.icon;
  const active = isItemActive(item, pathname, search);

  // ----- menu biasa (tanpa dropdown) -----
  if (!item.children) {
    return (
      <button
        type="button"
        onClick={() => item.path && onNavigate(item.path)}
        className={`${rowBase} ${active ? rowActive : rowIdle}`}
      >
        <Icon size={16} />
        <span className="flex-1 truncate text-left">{item.label}</span>
      </button>
    );
  }

  // ----- menu dropdown: tombol induk + daftar anak -----
  return (
    <div>
      {/* tombol induk */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`${rowBase} ${active ? rowActive : rowIdle}`}
      >
        <Icon size={16} />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* daftar anak (animasi tinggi lewat grid-rows 0fr -> 1fr) */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-2 space-y-1 border-l border-line pl-2">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <button
                  key={child.path}
                  type="button"
                  onClick={() => onNavigate(child.path)}
                  className={`${rowBase} py-1.5 text-xs ${isChildActive(child, pathname, search) ? childActive : childIdle}`}
                >
                  <ChildIcon size={15} />
                  <span className="flex-1 truncate text-left">{child.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}