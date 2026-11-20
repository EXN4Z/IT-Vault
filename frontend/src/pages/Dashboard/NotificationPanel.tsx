import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { disablePush, enablePush, getPushSubscription, isPushSupported } from '../../lib/push';
import { notificationService, type AppNotification } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

const POLL_MS = 15000;
const PER_HALAMAN = 2; // jumlah notifikasi per halaman

const iconBtn = 'cursor-pointer rounded-md p-1.5 text-ink-muted transition hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60';

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

// kartu notifikasi di dashboard: toggle notifikasi push + daftar notifikasi dengan paginasi
// `skeleton` = kerangka loading milik dashboard yang memakai panel ini (kalau kosong tampil teks "Memuat...")
export default function NotificationPanel({ skeleton }: { skeleton?: ReactNode }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>();
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [, setTick] = useState(0); // paksa render ulang supaya "x menit lalu" ikut berjalan

// ngambil role admin if admin = notif hide
  const { user } = useAuth();
  const isAdmin = user?.role?.nama?.toLowerCase() === 'admin';

  // ===== notifikasi push (sama seperti toggle yang dulu di top bar) =====
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

  // ===== daftar notifikasi (polling tiap 15 detik, sama dengan dropdown lama) =====
  const load = useCallback(async () => {
    try {
      const res = await notificationService.list();
      setItems(res.data);
      setUnread(res.unread_count);
    } catch {
      /* gagal polling -> abaikan, coba lagi di putaran berikutnya */
    }
  }, []);

  useEffect(() => {
    // muat pertama lewat callback (bukan memanggil load() langsung di badan effect)
    notificationService
      .list()
      .then((res) => {
        setItems(res.data);
        setUnread(res.unread_count);
      })
      .catch(() => {});
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setTick((t) => t + 1), 30000);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const handleClick = (n: AppNotification) => {
    if (!n.read_at) {
      const waktuBaca = new Date().toISOString();
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: waktuBaca } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notificationService.markRead(n.id).catch(() => load());
    }
    if (n.url) navigate(n.url);
  };

  const handleReadAll = () => {
    const waktuBaca = new Date().toISOString();
    setItems((prev) => prev?.map((x) => ({ ...x, read_at: x.read_at ?? waktuBaca })));
    setUnread(0);
    notificationService.markAllRead().catch(() => load());
  };

  // ===== paginasi =====
  const pageCount = Math.max(1, Math.ceil((items?.length ?? 0) / PER_HALAMAN));
  const currentPage = Math.min(page, pageCount);
  const shown = items?.slice((currentPage - 1) * PER_HALAMAN, currentPage * PER_HALAMAN);

  return (
    <section className="rounded-sm border border-line bg-surface">
      {/* kepala */}
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Notifikasi
          {unread > 0 && (
            <span className="grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button type="button" onClick={handleReadAll} className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">
            Tandai semua dibaca
          </button>
        )}
      </div>

      {/* toggle push */}
      {!isAdmin && (
      <div className="flex items-center justify-between gap-3 border-t border-line bg-hover/40 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium">Notifikasi push</p>
          <p className="truncate text-[11px] text-ink-muted">
            {!pushSupported ? 'Browser ini tidak mendukung' : isSubscribed ? 'Aktif di perangkat ini' : 'Mati di perangkat ini'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          aria-label="Notifikasi push"
          disabled={pushBusy || !pushSupported}
          onClick={handleTogglePush}
          className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isSubscribed ? 'bg-success' : 'bg-selected'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
              isSubscribed ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
      )}

      {/* daftar (tinggi minimal setara 3 item supaya paginasi tidak naik-turun) */}
      <div className="min-h-[112px] border-t border-line">
        {!shown ? (
          (skeleton ?? (
            <div className="flex h-[112px] flex-col items-center justify-center gap-2 px-4 text-center text-xs text-ink-muted">
              <BellOff size={18} />
              Memuat...
            </div>
          ))
        ) : shown.length === 0 ? (
          <div className="flex h-[112px] flex-col items-center justify-center gap-2 px-4 text-center text-xs text-ink-muted">
            <BellOff size={18} />
            Belum ada notifikasi masuk.
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {shown.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full cursor-pointer gap-2.5 px-4 py-2.5 text-left transition hover:bg-hover ${n.read_at ? '' : 'bg-selected/50 dark:bg-white/[0.04]'}`}
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs ${n.read_at ? 'text-ink-soft' : 'font-medium text-ink'}`}>{n.message}</span>
                    <span className="block text-[11px] text-ink-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* paginasi selalu tampil di posisi bawah yang tetap */}
      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          className={iconBtn}
          disabled={currentPage <= 1}
          onClick={() => setPage(currentPage - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] tabular-nums text-ink-muted">
          Halaman {currentPage} / {pageCount}
        </span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          className={iconBtn}
          disabled={currentPage >= pageCount}
          onClick={() => setPage(currentPage + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}