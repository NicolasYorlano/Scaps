import { useState } from 'react';
import { Link } from 'react-router';
import ModelViewer from '../components/ModelViewer';
import ProductImage from '../components/ProductImage';
import { useApiQuery } from '../hooks/useApi';
import type { ProductDetail } from '../types/product';

// Ajustá esta ruta a la de la ficha en App.tsx (ver nota abajo).
const rutaFicha = (slug: string) => `/productos/${slug}`;

/** Fallback del contrato: la landing nunca queda vacía. */
function ImagenFija() {
  return (
    <img
      src="/images/hero-gorra.jpg"
      alt="Gorra destacada Scaps"
      className="h-full w-full object-cover"
    />
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando" className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );
}

function AreaVisual() {
  const { data, error, loading } = useApiQuery<ProductDetail>('/products/featured');
  const [glbFallo, setGlbFallo] = useState(false);

  // 1. Esperando la API (con el backend dormido puede tardar).
  if (loading) return <Cargando />;

  // 2. 404 (sin destacado) o el pedido falló.
  if (error || !data) return <ImagenFija />;

  // 3. Hay destacado, pero el .glb no cargó: imagen principal, ya viene en la respuesta.
  if (glbFallo) {
    const principal = data.imagenes.find((img) => img.es_principal) ?? data.imagenes[0];
    if (!principal) return <ImagenFija />;
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-h-full w-full">
          <ProductImage image={principal} aspect="detail" />
        </div>
      </div>
    );
  }

  // 4. Hay destacado: visor 3D.
  return (
    <div className="relative h-full">
      <ModelViewer url={data.glb_url} onError={() => setGlbFallo(true)} />
      {/* pointer-events-none: el texto no bloquea el arrastre sobre el canvas */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3 text-center">
        <Link
          to={rutaFicha(data.slug)}
          className="pointer-events-auto text-sm font-semibold text-white underline-offset-4 hover:underline"
        >
          {data.nombre}
        </Link>
        <span className="text-xs text-slate-300">Arrastrá para rotar</span>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <section className="flex flex-1 items-center bg-slate-950 px-6 py-10 md:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
        {/* Texto y botón: se ven de entrada, sin esperar la API */}
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <h1 className="text-4xl font-bold text-white md:text-6xl">Scaps</h1>
          <p className="text-base text-gray-200 md:text-lg">
            Gorras con visor 3D. Elegí, personalizá y mirala desde todos los ángulos.
          </p>
          <Link
            to="/catalogo"
            className="mt-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 md:text-base"
          >
            Ver catálogo
          </Link>
        </div>

        {/* Alto limitado: en el celular tiene que sobrar pantalla para scrollear */}
        <div className="h-72 min-w-0 overflow-hidden rounded-scaps sm:h-96 md:h-[28rem]">
          <AreaVisual />
        </div>
      </div>
    </section>
  );
}
