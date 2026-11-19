import { useAuth } from '../../context/AuthContext';
import AppLayout from './AppLayout';
import UserLayout from './UserLayout';

// memilih kerangka halaman sesuai role: admin pakai sidebar penuh, user hanya header sederhana
export default function RoleLayout() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AppLayout /> : <UserLayout />;
}
