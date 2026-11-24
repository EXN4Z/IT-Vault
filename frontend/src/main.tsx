// titik masuk aplikasi: semua provider global dipasang di sini
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* tema (terang/gelap) */}
    <ThemeProvider>
      {/* routing halaman (HashRouter: refresh aman tanpa config server) */}
      <HashRouter>
        {/* state login: user + token */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  </StrictMode>,
);