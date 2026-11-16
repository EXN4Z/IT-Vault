import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// batas layar "mobile" (sama dengan breakpoint `lg` Tailwind)
const MOBILE_QUERY = '(max-width: 1023px)';

// kerangka halaman: sidebar di kiri, top bar di atas, isi halaman di tengah lewat <Outlet />
export default function AppLayout() {
  // desktop: panel menu terbuka / tertutup (rail ikon selalu tampil)
  const [panelOpen, setPanelOpen] = useState(true);
  // mobile: sidebar sebagai drawer yang muncul di atas konten
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  // tombol toggle di top bar: di mobile buka/tutup drawer, di desktop buka/tutup panel
  const togglePanel = () => (isMobile() ? setMobileOpen((v) => !v) : setPanelOpen((v) => !v));
  // klik ikon dropdown di rail: pastikan panel terbuka
  const openPanel = () => (isMobile() ? setMobileOpen(true) : setPanelOpen(true));
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-canvas text-ink">
      {/* ===== sidebar ===== */}
      <Sidebar
        panelOpen={panelOpen}
        mobileOpen={mobileOpen}
        closeMobile={closeMobile}
        openPanel={openPanel}
      />

      {/* ===== kolom kanan: top bar + isi halaman ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onTogglePanel={togglePanel} />

        {/* area isi halaman: lembar membulat di atas latar canvas */}
        <main className="flex-1 overflow-y-auto px-2 [scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent]">
          <div className="min-h-full rounded-xl bg-page p-4">
            {/* halaman (Dashboard, Data User, dst.) tampil di sini */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}