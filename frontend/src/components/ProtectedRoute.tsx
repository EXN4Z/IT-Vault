import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// pembungkus route yang wajib login; kalau belum login diarahkan ke /login
export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // masih mengecek sesi ke server -> tampilkan loading, jangan langsung redirect
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-page text-ink-muted">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}