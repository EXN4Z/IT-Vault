import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationService, type AppNotification } from '../../services/notificationService';

const POLL_MS = 15000;

const READ_VISIBLE_MS = 60_000;

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return 'baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const visibleItems = items.filter(
    (n) => !n.read_at || now - new Date(n.read_at).getTime() < READ_VISIBLE_MS,
  );



  const load = useCallback(async () => {
    try {
      const res = await notificationService.list();
      setItems(res.data);
      setUnread(res.unread_count);

      // alert hanya untuk ID baru yang tidak silent, dan bukan di muatan pertama
      if (!firstLoad.current) {
        res.data
          .filter((n) => !knownIds.current.has(n.id) && !n.silent)
          .forEach((n) => {
            // TODO: panggil toast yang kamu pakai, mis. toast(n.message)
            console.info('Notifikasi baru:', n.message);
          });
      }
      res.data.forEach((n) => knownIds.current.add(n.id));
      firstLoad.current = false;
    } catch {
      /* gagal polling -> abaikan, coba lagi di putaran berikutnya */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // klik di luar menutup dropdown
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read_at) {
      const waktuBaca = new Date().toISOString();
      setNow(Date.now());
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: waktuBaca } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notificationService.markRead(n.id).catch(() => load());
    }
    if (n.url) navigate(n.url);
  };

  const handleReadAll = async () => {
    const waktuBaca = new Date().toISOString();
    setNow(Date.now());
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? waktuBaca })));
    setUnread(0);
    notificationService.markAllRead().catch(() => load());
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="Notifikasi"
        onClick={() => setOpen((v) => !v)}
        className={`relative grid size-8 place-items-center rounded-lg text-ink-soft transition cursor-pointer hover:bg-hover ${open ? 'bg-hover' : ''}`}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg animate-fade-in">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">Notifikasi</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="text-xs font-medium text-ink-muted cursor-pointer hover:text-ink"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {visibleItems.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">Belum ada notifikasi masuk.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {visibleItems.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`flex w-full gap-2.5 border-b border-line px-4 py-2.5 text-left transition cursor-pointer last:border-b-0 hover:bg-hover ${
                      n.read_at ? '' : 'bg-selected'
                    }`}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-accent'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{n.message}</span>
                      <span className="block text-xs text-ink-muted">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}