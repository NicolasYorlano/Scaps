import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import ProductImage from '../components/ProductImage';
import { useApiQuery } from '../hooks/useApi';
import type { GalleryImage, ProductDetail } from '../types/product';

// Three.js pesa bastante: se baja aparte, así el texto y el botón se ven sin esperarlo.
const ModelViewer = lazy(() => import('../components/ModelViewer'));

// Fallback del contrato: sin destacado o con la API caída, la landing nunca queda vacía.
// Va en public/ y no viene de la API, así se ve aunque el backend esté dormido.
const HERO_IMAGE = {
  url: '/images/hero-gorra.webp',
  alt: 'Gorra Scaps vista de tres cuartos',
} satisfies Pick<GalleryImage, 'url' | 'alt'>;

// La landing ocupa justo la pantalla debajo del navbar (72 px + 1 px de borde, ver Navbar.tsx):
// el footer queda abajo del pliegue y aparece recién al scrollear. svh: sin las barras del navegador del celular.
const mainClassName =
  'relative flex min-h-[calc(100svh-4.5rem-1px)] flex-col gap-6 bg-scaps-canvas px-6 py-6 lg:px-12 lg:py-12';

// El visor llena lo que queda de la pantalla, sobre el fondo oscuro de la guía. En el celular, con tope:
// tocar el visor rota la gorra, así que tiene que sobrar pantalla para scrollear.
// Sin caja: un foco gris detrás de la gorra que se apaga hacia el fondo, así una gorra negra igual se recorta.
const stageClassName =
  'relative min-h-80 flex-1 overflow-hidden bg-[radial-gradient(ellipse_closest-side_at_50%_50%,var(--color-scaps-spotlight),transparent)] max-h-[70svh] md:min-h-96 md:max-h-none';

function Spinner() {
  return (
    <div role="status" className="flex h-full items-center justify-center">
      <span className="sr-only">Cargando producto destacado…</span>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-scaps-text-annotation/30 border-t-scaps-text-annotation" />
    </div>
  );
}

/**
 * "Arrastrá para rotar" entre dos flechas curvas, como un tramo de órbita a cada lado con las puntas hacia afuera:
 * la gorra se puede girar para los dos lados. Cada 5 s las flechas aparecen, se deslizan hacia afuera (cada una
 * hacia donde apunta) y se van (animate-arrow-*, en index.css); el texto queda fijo, así la ayuda se entiende aunque
 * no haya animación. La órbita es ancha y plana (radios 120 × 18) y cada flecha cubre solo su tramo exterior:
 * en el centro queda lugar para el texto. Los 8 px que se deslizan entran en el margen del viewBox, sin cortarse.
 * Si el sistema pide menos movimiento (en Windows: Efectos de animación apagado), las flechas quedan fijas.
 */
function RotateHint() {
  return (
    <div className="relative h-7 w-65">
      <svg
        aria-hidden="true"
        viewBox="0 0 260 28"
        className="absolute inset-0 h-full w-full fill-none stroke-current stroke-[1.5] text-scaps-text"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Izquierda: de abajo hacia la izquierda, se desliza a la izquierda */}
        <g className="motion-safe:animate-arrow-left">
          <path d="M61.2 18.7A120 18 0 0 1 14.1 8.7" />
          <path d="M16.7 14.1 14.1 8.7l6-.6" />
        </g>
        {/* Derecha: espejo de la izquierda, se desliza a la derecha */}
        <g className="motion-safe:animate-arrow-right">
          <path d="M198.8 18.7A120 18 0 0 0 245.9 8.7" />
          <path d="M243.3 14.1l2.6-5.4-6-.6" />
        </g>
      </svg>
      {/* A la altura del fondo de la órbita, entre las puntas de adentro de las flechas. */}
      <p className="absolute inset-x-0 bottom-1 text-center text-xs leading-none font-medium text-scaps-text-secondary">
        Arrastrá para rotar
      </p>
    </div>
  );
}

/** Una foto entera, centrada en el visor: el área blanca de la foto queda como una vitrina. */
function StillImage({ image }: { image: Pick<GalleryImage, 'url' | 'alt'> }) {
  return (
    <div className="flex h-full items-center justify-center p-6 md:p-10">
      <div className="aspect-square h-full max-w-full">
        <ProductImage image={image} aspect="square" />
      </div>
    </div>
  );
}

type StageProps = {
  product: ProductDetail | null;
  loading: boolean;
  modelFailed: boolean;
  onModelError: () => void;
};

function Stage({ product, loading, modelFailed, onModelError }: StageProps) {
  // Las flechas se van con el primer arrastre: ya entendió que se puede girar.
  const [touched, setTouched] = useState(false);

  // Con el backend dormido puede tardar: el texto y el botón ya están a la vista.
  if (loading) return <Spinner />;

  // 404 (no hay destacado) o el pedido falló.
  if (!product) return <StillImage image={HERO_IMAGE} />;

  const main = product.imagenes.find((img) => img.es_principal) ?? product.imagenes[0];

  return (
    <>
      {modelFailed ? (
        // El .glb no cargó: la foto principal, que ya vino en la respuesta.
        <StillImage image={main ?? HERO_IMAGE} />
      ) : (
        // touch-pan-y: el scroll vertical del dedo sigue moviendo la página en vez de quedar atrapado en el visor.
        <div
          onPointerDown={() => setTouched(true)}
          className="h-full cursor-grab active:cursor-grabbing [&_canvas]:touch-pan-y!"
        >
          <Suspense fallback={<Spinner />}>
            {/* margin 1.1: la gorra va un poco más grande que en la ficha (1.2), pero con aire para no cortarse al rotarla. */}
            <ModelViewer url={product.glb_url} margin={1.1} onError={onModelError} />
          </Suspense>
        </div>
      )}

      {/* El nombre del destacado, arriba a la izquierda: en diagonal con la marca, que va abajo a la izquierda. Texto plano: a la ficha lleva el botón. */}
      <div className="pointer-events-none absolute top-0 left-0 flex max-w-[60%] flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-scaps-text-muted uppercase">
          Destacada
        </p>
        {/* font-semibold: los trazos finos de Bodoni, más gruesos, no se pierden sobre el fondo oscuro. */}
        <p className="font-display text-[1.375rem] leading-tight font-semibold text-scaps-text md:text-[1.75rem]">
          {product.nombre}
        </p>
      </div>

      {/* Debajo de la gorra, al centro: abajo a los costados van la marca y el botón, el centro está libre. */}
      {!modelFailed && !touched && (
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
          <RotateHint />
        </div>
      )}
    </>
  );
}

export default function Landing() {
  const { data: product, loading } = useApiQuery<ProductDetail>('/products/featured');
  const [modelFailed, setModelFailed] = useState(false);

  return (
    <main className={mainClassName}>
      {/* Texto y botón: se ven desde el primer instante, sin esperar a la API.
          En el celular van arriba del visor, para que se vean sin scrollear.
          Desde md van encima del visor, en las esquinas de abajo, como la tapa de una revista: la marca a la izquierda y el botón a la derecha.
          pointer-events-none: el renglón cruza el visor y no puede tapar el arrastre; solo el botón recibe clics. */}
      <div className="flex flex-col gap-4 md:pointer-events-none md:absolute md:inset-x-6 md:bottom-6 md:z-10 md:flex-row md:items-end md:justify-between md:gap-8 lg:inset-x-12 lg:bottom-12">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-title font-bold text-scaps-text">Scaps</h1>
          {/* Arranca debajo de la "c" de Scaps: una "S" invisible, con la misma letra y tamaño que la marca, ocupa su ancho exacto en cualquier pantalla. */}
          <p className="text-[0.9375rem] font-medium text-scaps-text-secondary">
            <span aria-hidden="true" className="invisible inline-block h-0 overflow-hidden font-display text-title font-bold">
              S
            </span>
            Tienda online de gorras.
          </p>
        </div>
        {/* Mientras carga o si no hay destacado, lleva al catálogo: el botón está desde el primer instante y nunca queda muerto.
            El botón de la app; con fondo propio, para leerse aunque la gorra pase por detrás. */}
        <Link
          to={product ? `/producto/${product.slug}` : '/catalogo'}
          className="pointer-events-auto flex h-12 w-full shrink-0 items-center justify-center rounded-scaps border border-scaps-border-primary bg-scaps-canvas px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight md:w-auto"
        >
          {product ? 'Ver producto destacado' : 'Ver catálogo'}
        </Link>
      </div>

      <section aria-label="Producto destacado en 3D" className={stageClassName}>
        {/* absolute inset-0: el alto del visor sale del flex, y el canvas necesita una caja de medidas definidas para no medir cero. */}
        <div className="absolute inset-0">
          <Stage
            product={product}
            loading={loading}
            modelFailed={modelFailed}
            onModelError={() => setModelFailed(true)}
          />
        </div>
      </section>
    </main>
  );
}
