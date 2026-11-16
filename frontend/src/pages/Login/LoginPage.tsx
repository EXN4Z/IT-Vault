import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getErrorMessage } from '../../lib/errors';

// gambar cadangan kalau /public/login-bg.jpg tidak ditemukan
const FALLBACK_IMAGE =
  'https://img.magnific.com/premium-photo/visual-office-with-wellorganized-supply-room-including-inventory-management-office-sup_1314467-60091.jpg';

// class dasar kedua input (padding kiri/kanan ditambah per input)
const inputClass =
  'w-full py-2.5 bg-field border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition';

// class label kedua input
const labelClass = 'block text-xs font-semibold text-ink-soft mb-1.5';

// pilihan tema, dirender lewat map supaya tidak ada tombol yang ditulis dua kali
const themeOptions = [
  { value: 'light', label: 'Mode Terang', icon: Sun },
  { value: 'dark', label: 'Mode Gelap', icon: Moon },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();
  const { theme, setTheme } = useTheme();

  // ===== state form =====
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isFormEmpty = loginId.trim() === '' || password === '';

  // ===== kirim form: panggil API login, sukses -> ke dashboard =====
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormEmpty) return;
    setError('');
    setSubmitting(true);

    try {
      await login({ login: loginId, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // sudah login -> tidak perlu lihat halaman login lagi
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-page text-ink transition-colors">
      {/* =====================================================================
          PANEL KIRI: showcase brand (hanya tampil di layar besar)
          Warna di panel ini tetap (putih di atas foto), tidak ikut tema.
          ===================================================================== */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-black">
        {/* gambar latar full-bleed */}
        <img
          src="/login-bg.jpg"
          onError={(e) => {
            e.currentTarget.onerror = null; // cegah loop kalau gambar cadangan juga gagal
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          alt="Ruang penyimpanan inventory kantor"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* gradasi gelap supaya teks putih tetap terbaca */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/60 pointer-events-none" />

        {/* header: nama brand */}
        <div className="relative z-10">
          <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
            MARIMAS IT VAULT
          </h2>
          <p className="text-xs text-white/90 drop-shadow-sm font-medium mt-0.5">
            Integrated Inventory Management System
          </p>
        </div>

        {/* tengah: judul dan deskripsi */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Sistem Tata Kelola Inventory & Operasional Terpadu
          </h1>
          <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            Platform terpadu untuk pencatatan data, serah terima unit, penomoran kode barang,
            serta monitoring status dan riwayat inventaris di seluruh departemen dan cabang
            PT Marimas Putera Kencana.
          </p>
        </div>

        {/* footer: status server dan hak cipta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_var(--color-success)]" />
            <span className="font-semibold drop-shadow-md">Server Online & Beroperasi Normal</span>
          </div>
          <span className="font-medium text-white/90 drop-shadow-md">
            © 2026 PT Marimas Putera Kencana
          </span>
        </div>
      </div>

      {/* =====================================================================
          PANEL KANAN: area form login
          ===================================================================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* kartu form */}
          <div className="bg-surface border border-line shadow-xl rounded-2xl p-7 sm:p-9">
            {/* judul kartu */}
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-tight">Selamat Datang Di IT Inventory</h2>
              <p className="text-xs text-ink-muted mt-1">
                Masukkan kredensial akun Anda untuk mengakses sistem.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* input email atau nama */}
              <div>
                <label htmlFor="login" className={labelClass}>
                  Email atau Nama
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                    <User size={16} />
                  </div>
                  <input
                    id="login"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Masukkan email atau nama Anda"
                    className={`${inputClass} pl-10 pr-4`}
                  />
                </div>
              </div>

              {/* input password + tombol lihat/sembunyikan */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan password Anda"
                    className={`${inputClass} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink transition cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* pesan error (muncul kalau login gagal) */}
              {error && (
                <div
                  role="alert"
                  className="animate-fade-in text-xs text-danger bg-danger-bg border border-danger/25 rounded-xl px-3.5 py-2.5"
                >
                  {error}
                </div>
              )}

              {/* tombol submit */}
              <button
                type="submit"
                disabled={submitting || isFormEmpty}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-solid enabled:hover:bg-solid-hover text-solid-ink text-sm font-semibold py-3 rounded-xl shadow-md transition cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-selected disabled:text-ink-muted disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                  </>
                )}
              </button>
            </form>

            {/* pemisah */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-2 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                  Pilihan Tampilan
                </span>
              </div>
            </div>

            {/* pilihan tema terang / gelap */}
            <div className="grid grid-cols-2 p-1 rounded-xl border border-line bg-field">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    theme === value
                      ? 'bg-surface text-ink shadow-sm font-semibold'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* catatan keamanan */}
            <p className="mt-6 text-center text-[11px] leading-normal text-ink-muted">
              Akses terbatas hanya untuk staf & karyawan berwenang PT Marimas Putera Kencana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}