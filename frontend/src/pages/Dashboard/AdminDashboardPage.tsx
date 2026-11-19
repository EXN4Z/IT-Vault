import { useAuth } from '../../context/AuthContext';

// halaman sementara; diganti dashboard admin yang asli nanti
// (tombol keluar sudah ada di sidebar, jadi tidak perlu lagi di sini)
export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard Admin</h1>
      <p className="mt-2 text-sm text-ink-muted">Halo, {user?.name}</p>
    </div>
  );
}
