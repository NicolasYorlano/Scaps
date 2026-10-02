import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuentes servidas desde nuestro dominio, sin CDN externo.
// opsz: con el eje óptico, Bodoni engrosa sus trazos finos en tamaños chicos.
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/jost';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
