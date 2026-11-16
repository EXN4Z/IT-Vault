import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/Dashboard/DashboardPage';
import LoginPage from './pages/Login/LoginPage';
import MasterDataPage from './pages/MasterData/MasterDataPage';
import PenangananPage from './pages/Transaksi/Penanganan/PenangananPage';

// daftar semua route aplikasi
export default function App() {
  return (
    <Routes>
      {/* halaman publik (tanpa sidebar) */}
      <Route path="/login" element={<LoginPage />} />

      {/* halaman yang wajib login */}
      <Route element={<ProtectedRoute />}>
        {/* halaman yang memakai sidebar + top bar */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/master-data" element={<MasterDataPage />} />
          <Route path="/transaksi/penanganan" element={<PenangananPage />} />
        </Route>
      </Route>

      {/* route tidak dikenal -> kembali ke beranda */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}