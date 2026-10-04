import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {Link, NavigationType, useLocation, useNavigationType, useParams} from 'react-router';
import CubeIcon from '../components/CubeIcon';
import ErrorBoundary from '../components/ErrorBoundary';
import PhotoLightbox from '../components/PhotoLightbox';
import ProductImage from '../components/ProductImage';
import RelatedProducts from '../components/RelatedProducts';
import SoldOutBadge from '../components/SoldOutBadge';
import { useApiQuery } from '../hooks/useApi';
import { useSwipe } from '../hooks/useSwipe';
import { catalogPath } from '../lib/catalog-return';
import { focusField } from '../lib/forms';
import { formatPrice } from '../lib/format-price';
import { supportsWebGL } from '../lib/webgl';
import type { ProductDetail } from '../types/product';

// Three.js y el visor pesan bastante: no se bajan hasta que alguien va a tocar Ver en 3D.
const loadViewer = () => import('../components/ModelViewer');

type View = 'photos' | 'loading' | '3d';

const VIEW_BUTTON_LABEL: Record<View, string> = {
  photos: 'Ver en 3D',
  loading: 'Cancelar',
  '3d': 'Ver fotos',
};

// Por qué no se pudo abrir el 3D: el modelo, el código del visor o el navegador.
type Failure = 'model' | 'viewer' | 'webgl';

const FAILURE_TEXT: Record<Failure, string> = {
  model: 'No pudimos cargar el modelo 3D. Probá de nuevo.',
  viewer: 'No pudimos cargar el visor 3D.',
  webgl: 'Tu navegador no puede mostrar el modelo 3D.',
};

// Arriba a la derecha: esa esquina está libre en todas las fotos y se ve sin scrollear en cualquier pantalla.
// Anillo de foco oscuro: el claro del resto de la app no se ve sobre la foto blanca.
const viewButtonClassName =
  'absolute top-3 right-3 z-10 flex h-11 items-center gap-2 rounded-scaps border border-scaps-border-primary bg-scaps-canvas px-4 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight focus-visible:outline-scaps-page';

// Avisos encima de la foto o del visor: no ocupan lugar, así nada salta cuando aparecen.
// rounded-xl: en un renglón se ve como una píldora, y aguanta dos en un celular angosto.
const overlayNoteClassName =
  'pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-xl bg-scaps-canvas px-3 py-1 text-xs text-scaps-text-secondary';

const pageClassName =
  'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';

// Centrada y con el ancho justo de su contenido: la foto (700) y, desde lg, también las miniaturas (80) y los datos (384) con sus separaciones.
const contentClassName = 'mx-auto w-full max-w-175 lg:max-w-311';

// Las comparte el esqueleto: así tiene siempre la misma forma que la ficha.
// En una columna el orden es nombre y precio, fotos, descripción. Desde lg las fotos van a la izquierda, a lo alto de las dos filas.
const layoutClassName =
  'mt-6 grid grid-cols-[minmax(0,1fr)] gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-4 xl:gap-x-16';
const headerClassName =
  'flex flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:gap-4';
// Más chico en una columna: en la primera pantalla de un celular entran el nombre, el precio y la foto.
const titleClassName = 'text-heading lg:text-title';
// self-start: sin estirarse al alto de los datos, la galería mide lo que la foto.
// sticky: con una descripción larga, la foto sigue a la vista mientras se lee.
const galleryClassName =
  'flex min-w-0 flex-col gap-3 self-start lg:sticky lg:top-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 xl:flex-row xl:gap-4';
const descriptionClassName = 'lg:col-start-2 lg:row-start-2';
const mainImageClassName = 'min-w-0 max-w-175 flex-1';
// Miniaturas en fila debajo de la foto; desde xl, donde la foto ya es más alta que cinco miniaturas, en columna al costado.
// En columna la tira mide lo que la foto: la lista va absoluta adentro y scrollea si no entra.
const thumbRailClassName = 'relative shrink-0 xl:w-20';
// Sobresale 4 px por lado (-m-1 / -inset-1 con p-1) para que no se recorte el contorno de la miniatura activa.
// En escritorio, barra de scroll fina cuando no entran todas: ::-webkit-scrollbar para Chrome y Safari, scrollbar-width para Firefox.
const thumbListClassName =
  '-m-1 flex gap-3 overflow-x-auto p-1 xl:absolute xl:-inset-1 xl:m-0 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto lg:[&::-webkit-scrollbar]:size-1 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-scaps-border-input lg:[@supports(-moz-appearance:none)]:[scrollbar-color:var(--color-scaps-border-input)_transparent] lg:[@supports(-moz-appearance:none)]:[scrollbar-width:thin]';
// Quedan miniaturas sin ver: el final de la tira se desvanece.
const thumbFadeClassName =
  '[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] xl:[mask-image:linear-gradient(to_bottom,#000_calc(100%-2.5rem),transparent)]';
// En fila entran cinco justas en cualquier celular; con más, la tira scrollea.
const thumbClassName =
  'w-[calc((100%-3rem)/5)] max-w-16 shrink-0 xl:w-full xl:max-w-none';

// -my-3 py-3: 44 px de área táctil sin mover el texto, como el enlace del pie.
const backLinkClassName =
  '-my-3 py-3 text-sm font-medium text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary';

// Las fotos de un producto del seed.
const SKELETON_THUMBS = 5;

// Arrastre mínimo, en px, para dar el modelo por rotado: un toque o un scroll no cuentan.
const DRAG_THRESHOLD = 8;

/** Si a la tira le queda algo por scrollear: a lo ancho cuando va en fila, a lo alto en columna. */
function hasMoreToScroll(list: HTMLElement): boolean {
  const rest = Math.max(
    list.scrollWidth - list.clientWidth - list.scrollLeft,
    list.scrollHeight - list.clientHeight - list.scrollTop,
  );
  return rest > 4;
}

function Breadcrumb({ name }: { name?: string }) {
  // Vuelve al catálogo con la búsqueda desde la que se abrió la ficha.
  const catalog = catalogPath(useLocation().state);

  return (
    <nav aria-label="Migas de pan">
      <ol className="flex text-sm text-scaps-text-muted">
        {/* 44 px de área táctil, con el mismo ::after que los enlaces del navbar. */}
        <li className="relative shrink-0">
          <Link
            to={catalog}
            className="after:absolute after:inset-x-0 after:-inset-y-3 hover:text-scaps-text hover:underline"
          >
            Catálogo
          </Link>
        </li>
        {name && (
          <>
            <li aria-hidden="true" className="mx-2">
              /
            </li>
            {/* Una sola línea: el nombre completo ya está en el título. */}
            <li
              aria-current="page"
              className="min-w-0 truncate text-scaps-text-secondary"
            >
              {name}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

/** Toda la foto grande es un botón: un clic la amplía y, con el dedo, deslizar pasa a la de al lado. */
function ZoomButton({onZoom, onSwipe}: {onZoom: () => void; onSwipe: (step: 1 | -1) => void}) {
  const swipe = useSwipe(onSwipe);

  return (
    <button
      type="button"
      aria-label="Ampliar foto"
      {...swipe.handlers}
      onClick={() => {
        if (!swipe.wasSwipe()) onZoom();
      }}
      className="absolute inset-0 cursor-zoom-in touch-pan-y rounded-scaps focus-visible:-outline-offset-2 focus-visible:outline-scaps-page"
    />
  );
}

function Gallery({ product }: { product: ProductDetail }) {
  const images = [...product.imagenes].sort((a, b) => a.orden - b.orden);
  // La selección recuerda de qué producto es: al cambiar de slug vuelve sola a la principal.
  const [selected, setSelected] = useState<{ slug: string; id: string } | null>(
    null,
  );
  // Miniatura bajo el mouse: se ve en grande sin quedar elegida.
  // Se suelta al salir de la tira y no entre miniaturas, para que no parpadee.
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Foto abierta en grande; null si el visor ampliado está cerrado.
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [moreThumbs, setMoreThumbs] = useState(false);
  const thumbListRef = useRef<HTMLUListElement>(null);

  // Con key={slug} en el padre, cada producto arranca en las fotos.
  const [view, setView] = useState<View>('photos');
  const [failure, setFailure] = useState<Failure | null>(null);
  // Avance de la descarga del modelo; null hasta que el servidor informa el tamaño.
  const [progress, setProgress] = useState<number | null>(null);
  // Un lazy nuevo tras cada fallo: el anterior se queda con el error y ni intenta pedir el archivo otra vez.
  const [Viewer, setViewer] = useState(() => lazy(loadViewer));
  // La ayuda se va con el primer arrastre.
  const [rotated, setRotated] = useState(false);
  const [viewerFocused, setViewerFocused] = useState(false);
  const viewButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartX = useRef<number | null>(null);

  // Estable (useCallback): ModelViewer la vuelve a llamar si cambia.
  const handleModelReady = useCallback(() => {
    setView((current) => (current === 'loading' ? '3d' : current));
  }, [setView]);

  useEffect(() => {
    const list = thumbListRef.current;
    if (!list) return;
    // Cambia con el ancho de la pantalla: la tira pasa de fila a columna.
    const observer = new ResizeObserver(() =>
      setMoreThumbs(hasMoreToScroll(list)),
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (view === 'photos') return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setView('photos');
      // El visor se desmonta: si tenía el foco, no se pierde.
      viewButtonRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  const main = images.find((img) => img.es_principal) ?? images[0];
  const active =
    (selected?.slug === product.slug &&
      images.find((img) => img.id === selected.id)) ||
    main;

  if (!active) return null;

  const shown = images.find((img) => img.id === previewId) ?? active;

  // Pasa a la foto de al lado, dando la vuelta.
  function selectByStep(step: 1 | -1) {
    const index = images.findIndex((img) => img.id === active.id);
    const next = images[(index + step + images.length) % images.length];
    setSelected({ slug: product.slug, id: next.id });
  }

  function fail(kind: Failure) {
    setView('photos');
    setFailure(kind);
  }

  function toggleView() {
    setFailure(null);
    // Mientras carga, el mismo botón cancela.
    if (view !== 'photos') {
      setView('photos');
      return;
    }
    // Sin WebGL no tiene sentido bajar nada.
    if (!supportsWebGL()) {
      setFailure('webgl');
      return;
    }
    setProgress(null);
    setView('loading');
  }

  // Al acercarse al botón ya se va pidiendo el código del visor. Si falla, se reintenta al tocar.
  function preloadViewer() {
    if (supportsWebGL()) loadViewer().catch(() => {});
  }

  return (
    <div className={galleryClassName}>
      <div className={mainImageClassName}>
        <div className="relative rounded-scaps bg-scaps-photo">
          {/* Todas apiladas: cambiar de foto es un fundido, sin volver a montarla. */}
          {images.map((img, i) => (
            <div
              key={img.id}
              aria-hidden={img.id !== shown.id}
              className={`transition-opacity duration-150 motion-reduce:transition-none ${i > 0 ? 'absolute inset-0' : ''} ${img.id === shown.id ? '' : 'pointer-events-none opacity-0'}`}
            >
              <ProductImage
                image={img}
                aspect="detail"
                priority={img.id === main?.id}
              />
            </div>
          ))}

          {view === 'photos' && (
            <ZoomButton
              onZoom={() => setZoomedId(active.id)}
              onSwipe={selectByStep}
            />
          )}

          {/* Antes que el visor: el Tab va del botón al modelo y de ahí a las miniaturas. */}
          <button
            ref={viewButtonRef}
            type="button"
            onClick={toggleView}
            onPointerEnter={preloadViewer}
            onFocus={preloadViewer}
            className={viewButtonClassName}
          >
            {view === 'photos' && <CubeIcon className="h-4 w-4" />}
            {VIEW_BUTTON_LABEL[view]}
          </button>

          {view !== 'photos' && (
            // El visor carga encima de la foto, invisible: la foto sigue a la vista hasta que el modelo está listo.
            // touch-pan-y: el scroll vertical del dedo sigue moviendo la ficha en vez de quedar atrapado en el visor.
            <div
              inert={view === 'loading'}
              onPointerDown={(e) => {
                dragStartX.current = e.clientX;
              }}
              onPointerMove={(e) => {
                if (
                  dragStartX.current !== null &&
                  Math.abs(e.clientX - dragStartX.current) > DRAG_THRESHOLD
                ) {
                  setRotated(true);
                }
              }}
              onPointerUp={() => {
                dragStartX.current = null;
              }}
              onPointerCancel={() => {
                dragStartX.current = null;
              }}
              onFocus={(e) =>
                setViewerFocused(e.target.matches(':focus-visible'))
              }
              onBlur={() => setViewerFocused(false)}
              // **: y no solo el canvas: el touch-action: none de OrbitControls va en el div de R3F.
              className={`absolute inset-0 cursor-grab overflow-hidden rounded-scaps bg-scaps-photo transition-opacity duration-300 active:cursor-grabbing motion-reduce:transition-none **:touch-pan-y! **:touch-pinch-zoom! ${view === 'loading' ? 'pointer-events-none opacity-0' : ''}`}
            >
              <ErrorBoundary
                onError={() => {
                  fail('viewer');
                  setViewer(() => lazy(loadViewer));
                }}
              >
                <Suspense fallback={null}>
                  {/* Anillo de foco hacia adentro: el contenedor recorta lo que sobresale. */}
                  <Viewer
                    url={product.glb_url}
                    label={`Modelo 3D de ${product.nombre}`}
                    className="rounded-scaps focus-visible:-outline-offset-2 focus-visible:outline-scaps-page"
                    onProgress={setProgress}
                    onReady={handleModelReady}
                    onError={() => fail('model')}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}

          {view === 'loading' && (
            <p
              aria-hidden="true"
              className={`${overlayNoteClassName} flex items-center gap-2`}
            >
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none" />
              Cargando 3D…
              {progress !== null && (
                <span className="tabular-nums">{progress} %</span>
              )}
            </p>
          )}
          {view === '3d' && (
            <p
              aria-hidden="true"
              className={`${overlayNoteClassName} transition-opacity duration-300 ${rotated && !viewerFocused ? 'opacity-0' : ''}`}
            >
              {viewerFocused
                ? 'Usá las flechas para rotar'
                : 'Arrastrá para rotar'}
            </p>
          )}
          {failure && (
            <p role="alert" className={overlayNoteClassName}>
              {FAILURE_TEXT[failure]}
              {/* Un archivo del visor que no llega no vuelve solo: hace falta la página nueva. */}
              {failure === 'viewer' && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="pointer-events-auto -my-3.5 ml-2 py-3.5 font-medium text-scaps-text underline underline-offset-2"
                >
                  Recargar la página
                </button>
              )}
            </p>
          )}
          {/* Para lectores de pantalla: la carga del 3D y cuándo queda listo. */}
          <p role="status" className="sr-only">
            {view === 'loading'
              ? 'Cargando el modelo 3D…'
              : view === '3d'
                ? 'Modelo 3D listo'
                : ''}
          </p>
        </div>
      </div>

      {images.length > 1 && (
        <div className={thumbRailClassName}>
          <ul
            ref={thumbListRef}
            className={`${thumbListClassName} ${moreThumbs ? thumbFadeClassName : ''}`}
            onScroll={(e) => setMoreThumbs(hasMoreToScroll(e.currentTarget))}
            onPointerLeave={() => setPreviewId(null)}
          >
            {images.map((img) => {
              // En 3D ninguna foto está activa.
              const isActive = view !== '3d' && img.id === active.id;
              return (
                <li key={img.id} className={thumbClassName}>
                  <button
                    type="button"
                    aria-label={img.alt}
                    aria-current={isActive}
                    // El dedo no tiene hover: en el celular se elige tocando.
                    onPointerEnter={(e) => {
                      if (e.pointerType !== 'touch') setPreviewId(img.id);
                    }}
                    onClick={() => {
                      setSelected({ slug: product.slug, id: img.id });
                      setView('photos');
                      setFailure(null);
                    }}
                    className={`block w-full rounded-scaps outline-2 outline-offset-2 transition-[outline-color] focus-visible:outline-scaps-text ${
                      isActive
                        ? 'outline-scaps-border-primary'
                        : 'outline-transparent hover:outline-scaps-border-input'
                    }`}
                  >
                    <ProductImage image={img} aspect="square" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Al pasar de foto adentro, la ficha queda en la misma al cerrar. */}
      <PhotoLightbox
        images={images}
        currentId={zoomedId}
        onChange={(id) => {
          setZoomedId(id);
          setSelected({ slug: product.slug, id });
        }}
        onClose={() => setZoomedId(null)}
      />
    </div>
  );
}

// Misma forma que la ficha cargada: nada salta cuando llega el producto.
function ProductSkeleton() {
  return (
    <>
      <h1 className="sr-only">Cargando producto…</h1>
      <div
        aria-hidden="true"
        className={`${layoutClassName} motion-safe:animate-pulse`}
      >
        {/* Cada barra, con su margen, mide lo que el renglón de texto que reemplaza. */}
        <div className={headerClassName}>
          {/* h-lh: mide un renglón del título, sea cual sea el tamaño de pantalla. */}
          <div className={`flex h-lh items-center ${titleClassName}`}>
            <div className="h-[0.55em] w-2/3 rounded-full bg-scaps-placeholder" />
          </div>
          <div className="my-1.5 h-4 w-24 rounded-full bg-scaps-placeholder" />
        </div>

        <div className={galleryClassName}>
          <div className={mainImageClassName}>
            {/* Misma proporción que el aspect "detail" de ProductImage. */}
            <div className="aspect-square rounded-scaps bg-scaps-placeholder md:aspect-700/520" />
          </div>
          <div className={thumbRailClassName}>
            <ul className={`${thumbListClassName} overflow-hidden!`}>
              {Array.from({ length: SKELETON_THUMBS }, (_, i) => (
                <li
                  key={i}
                  className={`${thumbClassName} aspect-square rounded-scaps bg-scaps-placeholder`}
                />
              ))}
            </ul>
          </div>
        </div>

        <div className={`${descriptionClassName} flex flex-col gap-2.5 py-1.5`}>
          <div className="h-3 rounded-full bg-scaps-placeholder" />
          <div className="h-3 rounded-full bg-scaps-placeholder" />
          <div className="h-3 w-3/5 rounded-full bg-scaps-placeholder" />
        </div>
      </div>
    </>
  );
}

export default function Producto() {
  const { slug = '' } = useParams<{ slug: string }>();
  const catalog = catalogPath(useLocation().state);
  const navigationType = useNavigationType();
  // keep: una ficha ya vista aparece al instante, mientras se vuelve a pedir.
  const { data, error, loading, reload } = useApiQuery<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { keep: true });

  // La API tiene rutas propias bajo /products (featured): si devuelve otro producto que el pedido, no hay ficha.
  const product = data?.slug === slug ? data : null;
  const notFound = error?.status === 404 || (data !== null && !product);
  const failed = !notFound && !loading && !product;

  // La SPA no vuelve sola arriba al cambiar de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
    // Llegando por un enlace, el Tab arranca en el contenido y no donde quedó la card que se tocó.
    // preventScroll: el contenedor es más alto que la pantalla y enfocarlo correría la página.
    if (navigationType !== NavigationType.Pop) focusField('contenido', { preventScroll: true });
  }, [slug, navigationType]);

  const heading =
    product?.nombre ??
    (notFound
      ? 'Producto no encontrado'
      : failed
        ? 'No pudimos cargar el producto'
        : 'Cargando producto…');
  useEffect(() => {
    document.title = `${heading} | Scaps`;
    return () => {
      document.title = 'Scaps';
    };
  }, [heading]);

  return (
    <main
      className={
        notFound || failed
          ? `${pageClassName} items-center justify-center gap-4 text-center`
          : pageClassName
      }
    >
      {/* Siempre montado: un lector de pantalla oye la carga y en qué terminó. Del error avisa su propio alert. */}
      <p role="status" className="sr-only">
        {failed ? '' : heading}
      </p>

      {notFound ? (
        <>
          <h1 className="font-display text-heading text-scaps-text">
            Producto no encontrado
          </h1>
          <p className="text-sm text-scaps-text-secondary">
            El producto que buscás no existe o ya no está disponible.
          </p>
          <Link to={catalog} className={backLinkClassName}>
            Volver al catálogo
          </Link>
        </>
      ) : failed ? (
        <>
          <h1 className="font-display text-heading text-scaps-text">
            No pudimos cargar el producto
          </h1>
          <p role="alert" className="text-sm text-scaps-text-secondary">
            {error?.message ?? 'Volvé a intentar en un momento.'}
          </p>
          {/* El botón desaparece al reintentar: el foco va al contenido. */}
          <button
            type="button"
            onClick={() => {
              reload();
              focusField('contenido', { preventScroll: true });
            }}
            className="h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
          >
            Reintentar
          </button>
          <Link to={catalog} className={backLinkClassName}>
            Volver al catálogo
          </Link>
        </>
      ) : (
        <div className={contentClassName}>
          <Breadcrumb name={product?.nombre} />

          {product ? (
            <div className={layoutClassName}>
              <header className={headerClassName}>
                <h1
                  className={`font-display text-balance wrap-break-word text-scaps-text ${titleClassName}`}
                >
                  {product.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-medium text-scaps-text">
                    {formatPrice(product.precio)}
                  </p>
                  {/* La cantidad no se muestra: solo se avisa cuando no queda. */}
                  {product.stock <= 0 && <SoldOutBadge />}
                </div>
              </header>

              <Gallery key={product.slug} product={product} />

              {product.descripcion && (
                <p
                  className={`${descriptionClassName} text-sm leading-relaxed wrap-break-word whitespace-pre-line text-scaps-text-secondary`}
                >
                  {product.descripcion}
                </p>
              )}
            </div>
          ) : (
            <ProductSkeleton />
          )}

          <RelatedProducts currentSlug={slug} />
        </div>
      )}
    </main>
  );
}
