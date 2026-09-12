import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar';
import SlowServerNotice from './components/SlowServerNotice';
import RequireAdmin from './components/RequireAdmin';
import { useSessionStore } from './stores/session-store';
import Landing from './pages/Landing';
import Catalogo from './pages/Catalogo';
import Producto from './pages/Producto';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import MisDirecciones from './pages/MisDirecciones';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Admin from './pages/Admin';
import Health from './pages/Health';
import NotFound from './pages/NotFound';

export default function App() {
  // Una sola vez al arrancar la app: si hay token en localStorage, confirma
  // contra /auth/me que sigue vivo antes de dar la sesión por buena.
  useEffect(() => {
    void useSessionStore.getState().hydrate();
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-slate-950">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/producto/:slug" element={<Producto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/mis-direcciones" element={<MisDirecciones />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          <Route path="/health" element={<Health />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SlowServerNotice />
      </div>
    </BrowserRouter>
  );
}
