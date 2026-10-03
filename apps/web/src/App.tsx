import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SlowServerNotice from './components/SlowServerNotice';
import RequireAdmin from './components/RequireAdmin';
import RequireAuth from './components/RequireAuth';
import RequireGuest from './components/RequireGuest';
import { focusField } from './lib/forms';
import { useSessionStore } from './stores/session-store';
import Landing from './pages/Landing';
import Catalogo from './pages/Catalogo';
import Producto from './pages/Producto';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Admin from './pages/Admin';
import Health from './pages/Health';
import Creditos from './pages/Creditos';
import NotFound from './pages/NotFound';

export default function App() {
  // Una sola vez al arrancar la app: si hay token en localStorage, confirma
  // contra /auth/me que sigue vivo antes de dar la sesión por buena.
  useEffect(() => {
    void useSessionStore.getState().hydrate();
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-scaps-canvas">
        {/* Primer Tab de cada pantalla: saltea la barra. Solo se ve con el foco. */}
        <a
          href="#contenido"
          onClick={(e) => {
            e.preventDefault(); // sin cambiar la URL
            focusField('contenido');
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-scaps focus:bg-scaps-text focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-scaps-page"
        >
          Saltar al contenido
        </a>
        <Navbar />
        <div
          id="contenido"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/producto/:slug" element={<Producto />} />
            <Route
              path="/carrito"
              element={
                <RequireAuth>
                  <Carrito />
                </RequireAuth>
              }
            />
            <Route
              path="/login"
              element={
                <RequireGuest>
                  <Login />
                </RequireGuest>
              }
            />
            <Route
              path="/registro"
              element={
                <RequireGuest>
                  <Registro />
                </RequireGuest>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
            <Route path="/health" element={<Health />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <SlowServerNotice />
      </div>
    </BrowserRouter>
  );
}
