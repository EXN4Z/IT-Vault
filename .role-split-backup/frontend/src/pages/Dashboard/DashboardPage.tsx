import { useAuth } from '../../context/AuthContext';

// halaman sementara; diganti dashboard asli nanti
// (tombol keluar sudah ada di sidebar, jadi tidak perlu lagi di sini)
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-ink-muted">Halo, {user?.name}</p>
    </div>
  );
}