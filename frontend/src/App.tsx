import { Navigate, Route, Routes } from 'react-router-dom';
import AdminOnly from './components/AdminOnly';
import ProtectedRoute from './components/ProtectedRoute';
import RoleLayout from './components/layout/RoleLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LoginPage from './pages/Login/LoginPage';
import MasterDataPage from './pages/MasterData/MasterDataPage';
import LaporanPage from './pages/Laporan/LaporanPage';
import PenangananPage from './pages/Transaksi/Penanganan/PenangananPage';

// daftar semua route aplikasi
export default function App() {
  return (
    <Routes>
      {/* halaman publik (tanpa sidebar) */}
      <Route path="/login" element={<LoginPage />} />

      {/* halaman yang wajib login */}
      <Route element={<ProtectedRoute />}>
        {/* kerangka halaman mengikuti role: admin = sidebar + top bar, user = header sederhana */}
        <Route element={<RoleLayout />}>
          {/* dashboard dipilih sesuai role (admin / user), lihat DashboardPage */}
          <Route path="/" element={<DashboardPage />} />

          {/* halaman di bawah ini khusus admin; user dikembalikan ke dashboard */}
          <Route element={<AdminOnly />}>
            <Route path="/master-data" element={<MasterDataPage />} />
            <Route path="/laporan" element={<LaporanPage />} />
            <Route path="/transaksi/penanganan" element={<PenangananPage />} />
          </Route>
        </Route>
      </Route>

      {/* route tidak dikenal -> kembali ke beranda */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
