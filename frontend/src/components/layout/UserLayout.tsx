import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, BellRing, LogOut, Moon, Sun, Vault } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { disablePush, enablePush, getPushSubscription, isPushSupported } from '../../lib/push';
import NotificationDropdown from './NotificationDropdown';

// class tombol ikon di header (sama dengan top bar admin)
const iconButtonClass =
  'grid size-8 place-items-center rounded-lg text-ink-soft transition cursor-pointer hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

// =============================================================================
// USER LAYOUT: kerangka halaman untuk role user (tanpa sidebar, karena hanya ada dashboard)
// =============================================================================
export default function UserLayout() {
  const { user, logout } = useAuth();
  const { isDark, setTheme } = useTheme();

  // ===== notifikasi push (sama seperti toggle di sidebar admin) =====
  const pushSupported = isPushSupported();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;
    getPushSubscription().then((sub) => {
      setIsSubscribed(!!sub && Notification.permission === 'granted');
    });
  }, [pushSupported]);

  const handleTogglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (isSubscribed) {
        await disablePush();
        setIsSubscribed(false);
      } else {
        const result = await enablePush();
        if (result === 'ok') {
          setIsSubscribed(true);
        } else if (result === 'denied') {
          alert('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.');
        }
      }
    } catch (err) {
      console.error('Gagal mengubah status notifikasi', err);
      alert('Gagal mengubah status notifikasi. Coba lagi.');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-canvas text-ink">
      {/* ===== header: brand di kiri, aksi di kanan ===== */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-canvas px-3">
        {/* brand */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-canvas">
            <Vault size={16} />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold">Marimas IT Vault</p>
            <p className="hidden truncate text-xs text-ink-muted sm:block">Inventory saya</p>
          </div>
        </div>

        {/* aksi kanan */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Ganti tema"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={iconButtonClass}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* toggle notifikasi push */}
          <button
            type="button"
            title={!pushSupported ? 'Browser ini tidak mendukung notifikasi' : isSubscribed ? 'Matikan notifikasi' : 'Aktifkan notifikasi'}
            aria-label="Notifikasi push"
            aria-pressed={isSubscribed}
            disabled={pushBusy || !pushSupported}
            onClick={handleTogglePush}
            className={`${iconButtonClass} ${isSubscribed ? 'bg-selected text-ink' : ''}`}
          >
            {isSubscribed ? <BellRing size={17} /> : <Bell size={17} />}
          </button>

          <NotificationDropdown />

          <span className="hidden pl-1.5 text-sm font-semibold sm:block">{user?.name}</span>

          <button
            type="button"
            title="Keluar"
            aria-label="Keluar"
            onClick={logout}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink-soft transition hover:bg-danger-bg hover:text-danger"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* ===== isi halaman ===== */}
      <main className="flex-1 overflow-y-auto bg-page [scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]">
        <div className="mx-auto w-full max-w-4xl p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
