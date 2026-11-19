import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// pembungkus route khusus admin; user biasa dikembalikan ke dashboard-nya
export default function AdminOnly() {
  const { isAdmin } = useAuth();

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
