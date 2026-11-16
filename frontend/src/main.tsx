// titik masuk aplikasi: semua provider global dipasang di sini
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* tema (terang/gelap) */}
    <ThemeProvider>
      {/* routing halaman */}
      <BrowserRouter>
        {/* state login: user + token */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);