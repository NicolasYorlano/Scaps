import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './components/Navbar';
import SlowServerNotice from './components/SlowServerNotice';
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
import DevCapturas from "./pages/devcapturas";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-slate-950">
        <Navbar />
        <Routes>
	  <Route path="/dev-capturas" element={<DevCapturas />} />
          <Route path="/" element={<Landing />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/producto/:slug" element={<Producto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/mis-direcciones" element={<MisDirecciones />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/health" element={<Health />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SlowServerNotice />
      </div>
    </BrowserRouter>
  );
}
