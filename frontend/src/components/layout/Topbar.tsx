import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, PanelLeft, Search, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getBreadcrumb, navItems } from './navigation';

// class tombol ikon bulat-kotak di top bar (toggle sidebar, ganti tema)
const iconButtonClass =
  'grid size-8 place-items-center rounded-lg text-ink-soft transition cursor-pointer hover:bg-hover';

// daftar tujuan pencarian: semua menu biasa + semua anak dropdown (dihitung sekali, karena menu bersifat statis)
const searchEntries = navItems.flatMap((item) => {
  if (item.children) {
    return item.children.map((child) => ({
      key: `${item.label}-${child.label}`,
      label: child.label,
      parentLabel: item.label,
      path: child.path,
      icon: child.icon,
    }));
  }
  if (!item.path) return [];
  return [{ key: item.label, label: item.label, parentLabel: '', path: item.path, icon: item.icon }];
});

interface TopbarProps {
  onTogglePanel: () => void;
}

// =============================================================================
// TOPBAR: toggle sidebar, breadcrumb, pencarian menu, tema, dan info user
// =============================================================================
export default function Topbar({ onTogglePanel }: TopbarProps) {
  const { user } = useAuth();
  const { isDark, setTheme } = useTheme();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  const crumb = getBreadcrumb(pathname, search);

  // ===== state pencarian menu =====
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // ===== state dropdown notifikasi =====
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // cocokkan label menu (tidak peduli huruf besar/kecil); hasil hanya muncul kalau query tidak kosong
  const q = query.trim().toLowerCase();
  const results = q === '' ? [] : searchEntries.filter((entry) => entry.label.toLowerCase().includes(q));

  // klik di luar dropdown (search / notifikasi) menutup daftar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center justify-between gap-2 bg-canvas px-3">
      {/* ===== KIRI: tombol sidebar + breadcrumb ===== */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Buka/tutup sidebar"
          onClick={onTogglePanel}
          className={iconButtonClass}
        >
          <PanelLeft size={17} />
        </button>

        <span className="h-4 w-px bg-line" />

        {/* breadcrumb: Marimas IT Vault › Grup › Halaman */}
        <div className="flex min-w-0 items-center gap-2 truncate text-sm text-ink-muted">
          {crumb.current ? (
            <>
              <span>{crumb.group || 'Marimas IT Vault'}</span>
              <span>›</span>
              <b className="font-semibold text-ink">{crumb.current}</b>
            </>
          ) : (
            <b className="font-semibold text-ink">Marimas IT Vault</b>
          )}
        </div>
      </div>

      {/* =================================================================
          GLOBAL SEARCH: tepat di tengah header (absolute)
          ================================================================= */}
      <div
        ref={searchBoxRef}
        className="absolute left-1/2 top-1/2 hidden w-100 -translate-x-1/2 -translate-y-1/2 md:block"
      >
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Cari menu…"
          autoComplete="off"
          aria-label="Cari menu"
          className="h-7 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />

        {/* daftar hasil pencarian */}
        {searchOpen && q !== '' && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {results.length > 0 ? (
              results.map((entry) => {
                const EntryIcon = entry.icon;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleResultClick(entry.path)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition cursor-pointer hover:bg-hover"
                  >
                    <EntryIcon size={15} className="text-ink-muted" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    <small className="text-xs text-ink-muted">{entry.parentLabel}</small>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-ink-muted">Menu tidak ditemukan</p>
            )}
          </div>
        )}
      </div>

      {/* =================================================================
          AKSI KANAN: ganti tema + info user
          ================================================================= */}
      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {/* ganti tema terang / gelap */}
        <button
          type="button"
          aria-label="Ganti tema"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={iconButtonClass}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* notifikasi */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifikasi"
            onClick={() => setNotifOpen((v) => !v)}
            className={`${iconButtonClass} ${notifOpen ? 'bg-hover' : ''}`}
          >
            <Bell size={17} />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-lg animate-fade-in">
              <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">
                Notifikasi
              </div>
              <p className="px-4 py-8 text-center text-sm text-ink-muted">Belum ada notifikasi masuk.</p>
            </div>
          )}
        </div>

        {/* info user */}
        <div className="flex items-center gap-2.5 pl-1.5">
          <span className="hidden text-sm font-semibold text-ink sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}