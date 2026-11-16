import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

// ===== bentuk data yang dibagikan ke seluruh aplikasi =====
interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// tema awal: pilihan tersimpan -> kalau belum ada, ikuti pengaturan sistem
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage diblokir -> lanjut ke pengaturan sistem */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // ===== sinkronkan class `dark` di <html> dan simpan pilihan =====
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage diblokir -> abaikan */
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// hook untuk membaca/mengubah tema dari komponen mana pun
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus dipakai di dalam <ThemeProvider>');
  }
  return context;
}