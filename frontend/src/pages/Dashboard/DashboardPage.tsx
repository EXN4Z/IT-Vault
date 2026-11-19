import { useAuth } from '../../context/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';
import UserDashboardPage from './UserDashboardPage';

// pintu masuk route "/": admin melihat dashboard admin, user melihat dashboard user
export default function DashboardPage() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboardPage /> : <UserDashboardPage />;
}
