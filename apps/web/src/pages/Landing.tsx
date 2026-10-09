import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { preload } from 'react-dom';
import { Link } from 'react-router';
import ErrorBoundary from '../components/ErrorBoundary';
import ProductImage from '../components/ProductImage';
import { SLOW_SERVER_MESSAGE } from '../components/SlowServerNotice';
import SoldOutBadge from '../components/SoldOutBadge';
import { useApiQuery } from '../hooks/useApi';
import { useRotateHint } from '../hooks/useRotateHint';
import { formatPrice } from '../lib/format-price';
import { supportsWebGL } from '../lib/webgl';
import { useRequestStore } from '../stores/request-store';
import type { GalleryImage, ProductDetail } from '../types/product';

// Three.js pesa bastante: se baja aparte, así el texto y el botón se ven sin esperarlo.
const loadViewer = () => import('../components/ModelViewer');
const ModelViewer = lazy(loadViewer);

// Fallback del contrato: sin destacado o con la API caída, la landing nunca queda vacía.
// Va en public/ y no viene de la API, así se ve aunque el backend esté caído.
const HERO_IMAGE = {
  url: '/images/hero-gorra.webp',
  alt: 'Gorra Scaps vista de tres cuartos',
} satisfies Pick<GalleryImage, 'url' | 'alt'>;

// Los tres lugares de atrás. Cada uno tiene su gorra; si esa es la destacada, lo ocupa la Danlyvostok.
// Son renders del visor con el modelo girado para mirar al centro desde ese lugar.
// El max() las arrima cuando el renglón es angosto. --edge: cuánto puede pasar del renglón la de la derecha.
const BACKGROUND_SPOTS = [
  {
    far: true,
    style: { left: 'max(-6.7%, calc(0.458 * var(--s) - 50cqw))', bottom: '36.5%' },
    cap: { slug: 'cap-vanarsdale', src: '/images/fondo-vanarsdale.webp', size: [489, 435], width: '19%' },
    standIn: { src: '/images/fondo-danlyvostok-lejos.webp', size: [446, 385], width: '17.3%' },
  },
  {
    far: false,
    style: { left: 'max(-35.7%, calc(0.458 * var(--s) - 50cqw - 1.5rem))', bottom: '26.9%' },
    cap: { slug: 'cap-filipmatlak-oliva', src: '/images/fondo-oliva.webp', size: [599, 445], width: '31%' },
    standIn: { src: '/images/fondo-danlyvostok-izquierda.webp', size: [564, 403], width: '29.2%' },
  },
  {
    far: false,
    style: { right: 'max(-27.3%, calc(0.542 * var(--s) - 50cqw - var(--edge)))', bottom: '26.9%' },
    cap: { slug: 'cap-filipmatlak-negra', src: '/images/fondo-negra.webp', size: [629, 515], width: '31%' },
    standIn: { src: '/images/fondo-danlyvostok-derecha.webp', size: [607, 405], width: '29.9%' },
  },
];

// La landing ocupa justo la pantalla debajo del navbar (72 px + 1 px de borde, ver Navbar.tsx):
// el footer queda abajo del pliegue y aparece recién al scrollear. svh: sin las barras del navegador del celular.
// overflow-clip: la escena es más grande que su renglón y no puede asomar sobre el navbar ni dar scroll horizontal.
const mainClassName =
  'flex min-h-[calc(100svh-4.5rem-1px)] flex-col overflow-clip bg-scaps-canvas px-6 py-6 max-md:portrait:justify-center lg:px-12 lg:py-12';

// Mismo ancho máximo que el navbar y el footer. Apilados: título, gorra y cartel; apaisada y baja, el texto va al costado.
// En un celular vertical sobra alto: el conjunto tiene tope y queda centrado (el justify-center de main).
// grid y no flex: en un flex de alto indefinido, las unidades cqh del renglón de la gorra miden cero.
const contentClassName =
  'relative mx-auto grid w-full max-w-page flex-1 grid-cols-1 grid-rows-[auto_minmax(12rem,1fr)_auto] gap-4 max-md:portrait:max-h-[calc(105vw_+_15rem)] landscape:short:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)] landscape:short:grid-rows-[1fr_auto_auto_1fr] landscape:short:gap-x-8 landscape:short:gap-y-3 lg:landscape:short:gap-y-5';

// Con mouse deja pasar el arrastre al visor, que sigue por detrás; con el dedo, de acá se agarra la página para scrollear.
// La sombra lo mantiene legible cuando la gorra, girada, pasa por detrás.
const headlineClassName =
  'relative z-10 text-center font-display text-[clamp(1.5rem,7.6vw,1.875rem)] leading-[1.1] font-semibold text-balance text-scaps-text text-shadow-[0_0_12px_rgb(0_0_0/0.6)] md:text-[2.375rem] pointer-fine:pointer-events-none landscape:short:col-start-2 landscape:short:row-start-2 landscape:short:text-left landscape:short:text-2xl lg:landscape:short:text-[2rem]';

// Se queda con el alto que sobra. --above: lo que hay, como mínimo, entre el navbar y este renglón.
// --orbit: el lado más grande con el que la gorra, girada para cualquier lado, no llega al navbar.
// Sale de lo que ocupa vista desde abajo: 0,49 del lado desde el centro del visor, medido con los modelos del catálogo.
const stageClassName =
  '@container-size relative [--above:4rem] [--edge:1.5rem] [--orbit:calc(105cqh_+_1.05_*_var(--above))] max-md:portrait:[--orbit:min(94cqh_+_1.62_*_var(--above),105cqh_+_1.05_*_var(--above))] md:[--above:5rem] lg:[--above:6.5rem] landscape:short:col-start-1 landscape:short:row-span-4 landscape:short:row-start-1 landscape:short:[--above:1.5rem] landscape:short:[--edge:0rem] lg:landscape:short:[--above:3rem]';

// La escena es un cuadrado: el piso, el plato y las otras gorras van en % de su lado (--s).
// --s, en orden: que entre de alto, que girada no llegue al navbar y que no pase del ancho de la pantalla.
const SCENE_STYLE = { '--s': 'min(148cqh, var(--orbit), calc(99cqw + 3rem))' } as CSSProperties;
// Corrida a la derecha lo justo para que el plato, que no está en el medio de la escena, quede centrado con el título.
// El plato apoya en el borde de abajo del renglón; en un celular vertical, un poco más abajo que el centro.
const sceneClassName =
  'absolute left-[calc(50%_+_0.042_*_var(--s))] top-[calc(100%_-_0.975_*_var(--s))] aspect-square w-(--s) -translate-x-1/2 max-md:portrait:top-[min(calc(58%_-_0.6375_*_var(--s)),calc(100%_-_0.975_*_var(--s)))]';

// Lo que avisa una espera entra con una demora: si el modelo ya estaba en caché, no llega a verse.
const waitClassName = 'transition-opacity delay-200 duration-300 starting:opacity-0';

/** Lo que se lee en el borde del plato: la ayuda para girarla o qué se está esperando. */
function PlateNote({ children, long = false, waiting = false }: { children: ReactNode; long?: boolean; waiting?: boolean }) {
  return (
    // Con fondo propio: tapa el tramo del aro que tiene detrás.
    <p
      className={`bg-scaps-canvas px-3 text-center font-medium text-scaps-text-secondary ${long ? 'w-56 text-xs' : 'text-[0.6875rem] tracking-[0.12em] whitespace-nowrap uppercase'} ${waiting ? waitClassName : ''}`}
    >
      {children}
    </p>
  );
}

/** Una foto entera, centrada en el visor: el área blanca de la foto queda como una vitrina. */
function StillImage({ image }: { image: Pick<GalleryImage, 'url' | 'alt'> }) {
  return (
    // El cuadrado más grande que entra, centrado: cqw y cqh miden el renglón de la gorra.
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_closest-side_at_50%_50%,var(--color-scaps-spotlight),transparent)]">
      <div className="w-[min(92cqw,92cqh)]">
        <ProductImage image={image} aspect="square" />
      </div>
    </div>
  );
}

/** Qué producto es el destacado. El nombre es el enlace a su ficha y todo el bloque, su área de toque. */
function FeaturedInfo({ product }: { product: ProductDetail }) {
  return (
    // El anillo de foco va en el bloque: el del enlace lo recortaría el line-clamp del nombre.
    <div className="group relative flex max-w-xl flex-col items-center gap-1 rounded-scaps text-center has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-scaps-text landscape:short:items-start landscape:short:text-left">
      <p className="text-xs font-semibold tracking-[0.14em] text-scaps-text-muted uppercase">
        Destacada
      </p>
      {/* font-semibold: los trazos finos de Bodoni, más gruesos, no se pierden sobre el fondo oscuro. */}
      {/* Dos renglones como mucho; el nombre completo queda en el title. */}
      <h2
        title={product.nombre}
        className="line-clamp-2 font-display text-2xl leading-tight font-semibold wrap-break-word text-scaps-text md:text-[1.875rem]"
      >
        <Link to={`/producto/${product.slug}`} className="outline-none after:absolute after:inset-0">
          {product.nombre}
        </Link>
      </h2>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium text-scaps-text-secondary tabular-nums md:text-[0.9375rem] landscape:short:justify-start">
        {formatPrice(product.precio)}
        {/* Como en la ficha: solo se avisa cuando no queda. */}
        {product.stock <= 0 && <SoldOutBadge />}
        {/* A la vista dice a dónde lleva; para un lector de pantalla el enlace ya es el nombre. */}
        <span aria-hidden="true" className="text-scaps-border-input">
          |
        </span>
        <span
          aria-hidden="true"
          className="text-scaps-text underline decoration-1 underline-offset-4 group-hover:text-scaps-text-secondary"
        >
          Ver producto
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 fill-none stroke-current stroke-[1.25] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
    </div>
  );
}

type StageProps = {
  product: ProductDetail | null;
  loading: boolean;
};

function Stage({ product, loading }: StageProps) {
  const isSlow = useRequestStore((state) => state.isSlow);
  // Cómo le fue al modelo, y de qué destacado: si la API devuelve otro, arranca de cero.
  const [model, setModel] = useState<{ slug: string; state: 'ready' | 'failed' } | null>(null);
  // Avance de la descarga, de 0 a 100: null hasta saber el tamaño.
  const [progress, setProgress] = useState<number | null>(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const hint = useRotateHint();

  const slug = product?.slug ?? null;
  const modelState = slug !== null && model?.slug === slug ? model.state : 'loading';

  // Estables (useCallback): ModelViewer vuelve a llamar a onReady si cambia.
  const handleReady = useCallback(() => {
    if (slug !== null) setModel({ slug, state: 'ready' });
  }, [slug]);
  const handleFailed = useCallback(() => {
    if (slug !== null) setModel({ slug, state: 'failed' });
  }, [slug]);

  // Sin WebGL no se bajan el visor ni el modelo: va directo a la foto.
  const showPhoto = product !== null && (modelState === 'failed' || !supportsWebGL());
  const ready = product !== null && !showPhoto && modelState === 'ready';
  // Esperando a la API o al modelo: plato vacío con spinner. Sin gorra fija: la destacada puede ser cualquiera.
  const waiting = loading || (product !== null && !showPhoto && !ready);
  // La ayuda se va cuando ya giraron la gorra; con el foco del teclado en el visor, se queda.
  const showHint = ready && (!hint.rotated || hint.viewerFocused);

  // El .glb se pide apenas se conoce, en paralelo con el visor: el loader de three reusa esa descarga.
  if (product !== null && !showPhoto && !ready) {
    preload(product.glb_url, { as: 'fetch', crossOrigin: 'anonymous' });
  }

  const main = product?.imagenes.find((img) => img.es_principal) ?? product?.imagenes[0];

  return (
    <>
      {product !== null && showPhoto ? (
        // El .glb no cargó: la foto principal, que ya vino en la respuesta.
        // También si el visor no llega o no hay WebGL.
        <StillImage image={main ?? HERO_IMAGE} />
      ) : (
        <div style={SCENE_STYLE} className={sceneClassName}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {/* La pared con la luz detrás de la gorra, el piso y la línea donde se juntan. */}
            <div className="absolute inset-x-[-40%] top-[8%] h-[52%] bg-[radial-gradient(ellipse_47%_64%_at_47.7%_70%,var(--color-scaps-spotlight),transparent)]" />
            <div className="absolute inset-x-[-40%] top-[60%] h-[46%] bg-[radial-gradient(ellipse_47%_78%_at_47.7%_22%,color-mix(in_srgb,var(--color-scaps-spotlight)_45%,transparent),transparent)]" />
            <div className="absolute inset-x-[-40%] top-[60%] h-px bg-[linear-gradient(to_right,transparent,var(--color-scaps-border)_28%,var(--color-scaps-border)_72%,transparent)]" />

            {/* Apagadas y con menos color: acompañan sin sacarle el lugar a la destacada. */}
            {BACKGROUND_SPOTS.map((spot) => {
              // Si la gorra de este lugar es la destacada, acá va la Danlyvostok.
              const image = spot.cap.slug === slug ? spot.standIn : spot.cap;
              return (
                <div key={image.src} style={{ ...spot.style, width: image.width }} className="absolute">
                  <div className="absolute inset-x-[-4%] bottom-[-7%] h-[20%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.8),rgb(0_0_0/0.4)_40%,transparent_70%)] blur-xs" />
                  <img
                    src={image.src}
                    alt=""
                    width={image.size[0]}
                    height={image.size[1]}
                    fetchPriority="low"
                    className={`relative block h-auto w-full saturate-[.55] ${spot.far ? 'blur-[0.6px] brightness-[.5]' : 'blur-[0.4px] brightness-[.6]'}`}
                  />
                </div>
              );
            })}

            {/* El plato y su sombra. La gorra flota apenas arriba: girada para cualquier lado, no choca con el piso. */}
            <div className="absolute top-[81.5%] left-[10.8%] h-[9%] w-[70%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.85),rgb(0_0_0/0.45)_38%,transparent_70%)] blur-[5px]" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible fill-none">
              <ellipse cx="45.8" cy="84.7" rx="47" ry="11.5" vectorEffect="non-scaling-stroke" className="stroke-scaps-border" />
              {/* Con el foco del teclado en el visor, el anillo de foco es el plato. */}
              <ellipse
                cx="45.8"
                cy="84"
                rx="47"
                ry="11.5"
                vectorEffect="non-scaling-stroke"
                className={hint.viewerFocused ? 'stroke-scaps-text stroke-2' : 'stroke-scaps-border-input'}
              />
            </svg>
          </div>

          {/* 404 (no hay destacado) o el pedido falló. */}
          {product === null && !loading && !fallbackFailed && (
            <img
              src={HERO_IMAGE.url}
              alt={HERO_IMAGE.alt}
              onError={() => setFallbackFailed(true)}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain transition-opacity duration-300 starting:opacity-0"
            />
          )}

          {product !== null && (
            // Carga invisible, como en la ficha: así no se ve el indicador interno del visor, que no avanza.
            // El dedo sobre el visor rota la gorra; la página se scrollea desde afuera.
            // Canvas más grande que la escena, compensado con el margin: uno justo corta la gorra en el aire al girarla.
            <div
              key={product.slug}
              inert={!ready}
              {...hint.handlers}
              className={`absolute top-[-15.4%] left-[-17.7%] h-[134.5%] w-[134.5%] cursor-grab transition-opacity duration-300 active:cursor-grabbing motion-reduce:transition-none ${ready ? '' : 'pointer-events-none opacity-0'}`}
            >
              {/* Si el archivo del visor no llega, el error no desmonta la app: se pasa a la foto. */}
              <ErrorBoundary onError={handleFailed}>
                <Suspense fallback={null}>
                  {/* Sin contorno propio: el foco se marca en el plato. */}
                  <ModelViewer
                    url={product.glb_url}
                    label={`Modelo 3D de ${product.nombre}`}
                    className="outline-none"
                    margin={1.43}
                    onProgress={setProgress}
                    onReady={handleReady}
                    onError={handleFailed}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {/* Donde va a aparecer la gorra. */}
            {waiting && (
              <div
                className={`absolute top-[56%] left-[45.8%] h-11 w-11 -translate-1/2 animate-spin rounded-full border-2 border-current/30 border-t-current text-scaps-text-secondary motion-reduce:animate-none lg:h-14 lg:w-14 ${waitClassName}`}
              />
            )}
            {/* Las puntas del plato: para dónde gira (animate-arrow-*, en index.css). Con el teclado no hay nada que arrastrar. */}
            {showHint && !hint.viewerFocused && (
              <>
                <svg
                  viewBox="0 0 14 12"
                  className="absolute top-[84%] left-[-1.2%] h-3 w-3.5 -translate-1/2 fill-none stroke-scaps-text-secondary stroke-[1.5] motion-safe:animate-arrow-left"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 10 7 2l6 8" />
                </svg>
                <svg
                  viewBox="0 0 14 12"
                  className="absolute top-[84%] left-[92.8%] h-3 w-3.5 -translate-1/2 fill-none stroke-scaps-text-secondary stroke-[1.5] motion-safe:animate-arrow-right"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 2l6 8 6-8" />
                </svg>
              </>
            )}
            {/* En el frente del plato. */}
            <div className="absolute top-[95.5%] left-[45.8%] -translate-1/2">
              {loading ? (
                // Con el backend dormido puede tardar: el texto y el botón ya están a la vista.
                isSlow ? (
                  <PlateNote waiting long>
                    {SLOW_SERVER_MESSAGE}
                  </PlateNote>
                ) : (
                  <PlateNote waiting>Cargando…</PlateNote>
                )
              ) : product !== null && !ready ? (
                <PlateNote waiting>
                  Cargando 3D…
                  {progress !== null && <span className="tabular-nums"> {progress} %</span>}
                </PlateNote>
              ) : (
                showHint && <PlateNote>{hint.viewerFocused ? 'Usá las flechas para rotar' : 'Arrastrá para rotar'}</PlateNote>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Para lectores de pantalla: qué se está esperando y cuándo queda listo el 3D. */}
      <p role="status" className="sr-only">
        {loading
          ? isSlow
            ? SLOW_SERVER_MESSAGE
            : 'Cargando producto destacado…'
          : ready
            ? 'Modelo 3D listo'
            : product !== null && !showPhoto
              ? 'Cargando el modelo 3D…'
              : ''}
      </p>
    </>
  );
}

export default function Landing() {
  // keep: al volver a la landing el destacado aparece al instante, mientras se vuelve a pedir.
  const { data: product, loading } = useApiQuery<ProductDetail>('/products/featured', { keep: true });

  // El código del visor se pide ya, en paralelo con la API. Si falla, lo vuelve a intentar el lazy.
  useEffect(() => {
    if (supportsWebGL()) loadViewer().catch(() => {});
  }, []);

  return (
    <main className={mainClassName}>
      <div className={contentClassName}>
        {/* La marca ya está en el logo de la barra: el título de la página queda para lectores de pantalla. */}
        <h1 className="sr-only">Scaps</h1>
        <p className={headlineClassName}>Mirala en 3D antes de elegirla.</p>

        <div className={stageClassName}>
          <Stage product={product} loading={loading} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3.5 landscape:short:col-start-2 landscape:short:row-start-3 landscape:short:items-start">
          {/* Alto reservado siempre: la gorra no salta cuando llega el destacado, ni si no hay. */}
          <div className="flex min-h-18 w-full flex-col items-center md:min-h-21 landscape:short:items-start">
            {product && <FeaturedInfo product={product} />}
          </div>
          {/* Siempre al catálogo: no cambia cuando contesta la API. A la ficha lleva el nombre del destacado.
              El botón de la app; con fondo propio, para leerse aunque la gorra pase por detrás. */}
          <Link
            to="/catalogo"
            className="flex h-12 w-full shrink-0 items-center justify-center rounded-scaps border border-scaps-border-primary bg-scaps-canvas px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight md:w-auto landscape:short:w-full lg:landscape:short:w-auto"
          >
            Ver catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
