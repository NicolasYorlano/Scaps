import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import ProductImage from '../components/ProductImage';
import RelatedProducts from '../components/RelatedProducts';
import { useApiQuery } from '../hooks/useApi';
import { formatPrice } from '../lib/format-price';
import type { ProductDetail } from '../types/product';

// Three.js y el visor pesan bastante: se bajan recién al tocar Ver en 3D.
const ModelViewer = lazy(() => import('../components/ModelViewer'));

type View = 'photos' | 'loading' | '3d';

const VIEW_BUTTON_LABEL: Record<View, string> = {
  photos: 'Ver en 3D',
  loading: 'Cargando 3D…',
  '3d': 'Ver fotos',
};

// Arriba a la derecha: esa esquina está libre en todas las fotos y se ve sin scrollear en cualquier pantalla.
// Anillo de foco oscuro: el claro del resto de la app no se ve sobre la foto blanca.
const viewButtonClassName =
  'absolute top-3 right-3 flex h-10 items-center gap-2 rounded-scaps border border-scaps-border-primary bg-scaps-canvas px-4 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight focus-visible:outline-scaps-page';

// Avisos encima de la foto o del visor: no ocupan lugar, así nada salta cuando aparecen.
const overlayNoteClassName =
  'pointer-events-none absolute bottom-3 left-3 rounded-full bg-scaps-canvas px-3 py-1 text-xs text-scaps-text-secondary';

const pageClassName =
  'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';

// Centrada y con el ancho justo de su contenido: la foto (700) y, desde lg, también las miniaturas (80) y los datos (384) con sus separaciones.
const contentClassName = 'mx-auto w-full max-w-175 lg:max-w-311';

// Las comparte el esqueleto: así tiene siempre la misma forma que la ficha.
const layoutClassName =
  'mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12 xl:gap-16';
// self-start: sin estirarse al alto de los datos, la galería mide lo que la foto.
const galleryClassName =
  'flex min-w-0 flex-col gap-3 self-start xl:flex-row xl:gap-4';
const mainImageClassName = 'min-w-0 max-w-175 flex-1';
// Miniaturas en fila debajo de la foto; desde xl, donde la foto ya es más alta que cinco miniaturas, en columna al costado.
// En columna la tira mide lo que la foto: la lista va absoluta adentro y scrollea si no entra.
const thumbRailClassName = 'relative shrink-0 xl:w-20';
// Sobresale 4 px por lado (-m-1 / -inset-1 con p-1) para que no se recorte el contorno de la miniatura activa.
// En escritorio, barra de scroll fina cuando no entran todas: ::-webkit-scrollbar para Chrome y Safari, scrollbar-width para Firefox.
const thumbListClassName =
  '-m-1 flex gap-3 overflow-x-auto p-1 xl:absolute xl:-inset-1 xl:m-0 xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto lg:[&::-webkit-scrollbar]:size-1 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-scaps-border-input lg:[@supports(-moz-appearance:none)]:[scrollbar-color:var(--color-scaps-border-input)_transparent] lg:[@supports(-moz-appearance:none)]:[scrollbar-width:thin]';
const thumbClassName = 'w-16 shrink-0 xl:w-full';

// Las fotos de un producto del seed.
const SKELETON_THUMBS = 5;

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Migas de pan" className="text-sm text-scaps-text-muted">
      <Link to="/catalogo" className="hover:text-scaps-text hover:underline">
        Catálogo
      </Link>
      {name && (
        <>
          <span className="mx-2">/</span>
          <span className="text-scaps-text-secondary">{name}</span>
        </>
      )}
    </nav>
  );
}

function Gallery({ product }: { product: ProductDetail }) {
  const images = [...product.imagenes].sort((a, b) => a.orden - b.orden);
  // La selección recuerda de qué producto es: al cambiar de slug vuelve sola a la principal.
  const [selected, setSelected] = useState<{ slug: string; id: string } | null>(
    null,
  );

  // Con key={slug} en el padre, cada producto arranca en las fotos.
  const [view, setView] = useState<View>('photos');
  const [modelFailed, setModelFailed] = useState(false);
  // La ayuda se va con el primer arrastre.
  const [rotated, setRotated] = useState(false);

  // Estable (useCallback): ModelViewer la vuelve a llamar si cambia.
  const handleModelReady = useCallback(() => {
    setView((current) => (current === 'loading' ? '3d' : current));
  }, []);

  const main = images.find((img) => img.es_principal) ?? images[0];
  const active =
    (selected?.slug === product.slug &&
      images.find((img) => img.id === selected.id)) ||
    main;

  if (!active) return null;

  return (
    <div className={galleryClassName}>
      <div className={mainImageClassName}>
        <div className="relative">
          <ProductImage image={active} aspect="detail" />

          {view !== 'photos' && (
            // El visor carga encima de la foto, invisible: la foto sigue a la vista hasta que el modelo está listo.
            // touch-pan-y: el scroll vertical del dedo sigue moviendo la ficha en vez de quedar atrapado en el visor.
            <div
              aria-hidden={view === 'loading'}
              onPointerDown={() => setRotated(true)}
              className={`absolute inset-0 cursor-grab overflow-hidden rounded-scaps bg-scaps-photo transition-opacity duration-300 active:cursor-grabbing motion-reduce:transition-none [&_canvas]:touch-pan-y! ${view === 'loading' ? 'pointer-events-none opacity-0' : ''}`}
            >
              <Suspense fallback={null}>
                <ModelViewer
                  url={product.glb_url}
                  onReady={handleModelReady}
                  onError={() => {
                    setView('photos');
                    setModelFailed(true);
                  }}
                />
              </Suspense>
            </div>
          )}

          <button
            type="button"
            aria-disabled={view === 'loading'}
            onClick={() => {
              // Mientras carga no hace nada: a las fotos se vuelve tocando una miniatura.
              if (view === 'loading') return;
              setModelFailed(false);
              setView(view === 'photos' ? 'loading' : 'photos');
            }}
            className={`${viewButtonClassName} ${view === 'loading' ? 'cursor-progress' : ''}`}
          >
            {view === 'loading' && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
              />
            )}
            {VIEW_BUTTON_LABEL[view]}
          </button>

          {view === '3d' && (
            <p
              className={`${overlayNoteClassName} transition-opacity duration-300 ${rotated ? 'opacity-0' : ''}`}
            >
              Arrastrá para rotar
            </p>
          )}
          {modelFailed && (
            <p role="alert" className={overlayNoteClassName}>
              No pudimos cargar el modelo 3D
            </p>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className={thumbRailClassName}>
          <ul className={thumbListClassName}>
            {images.map((img) => {
              // En 3D ninguna foto está activa.
              const isActive = view !== '3d' && img.id === active.id;
              return (
                <li key={img.id} className={thumbClassName}>
                  <button
                    type="button"
                    aria-label={img.alt}
                    aria-current={isActive}
                    onClick={() => {
                      setSelected({ slug: product.slug, id: img.id });
                      setView('photos');
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
    </div>
  );
}

// Misma forma que la ficha cargada: nada salta cuando llega el producto.
function ProductSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando producto…
      </p>
      <div
        aria-hidden="true"
        className={`${layoutClassName} motion-safe:animate-pulse`}
      >
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

        {/* Cada barra, con su margen, mide lo que el renglón de texto que reemplaza. */}
        <div className="flex flex-col gap-4">
          <div className="my-1 h-5 w-2/3 rounded-full bg-scaps-placeholder" />
          <div className="my-1.5 h-4 w-24 rounded-full bg-scaps-placeholder" />
          <div className="flex flex-col gap-2.5 py-1.5">
            <div className="h-3 rounded-full bg-scaps-placeholder" />
            <div className="h-3 rounded-full bg-scaps-placeholder" />
            <div className="h-3 w-3/5 rounded-full bg-scaps-placeholder" />
          </div>
        </div>
      </div>
    </>
  );
}

export default function Producto() {
  const { slug = '' } = useParams<{ slug: string }>();
  const {
    data: product,
    error,
    loading,
    reload,
  } = useApiQuery<ProductDetail>(`/products/${encodeURIComponent(slug)}`);

  // La SPA no vuelve sola arriba al cambiar de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const name = product?.nombre;
  useEffect(() => {
    document.title = name ? `${name} | Scaps` : 'Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, [name]);

  if (error?.status === 404) {
    return (
      <main
        className={`${pageClassName} items-center justify-center gap-4 text-center`}
      >
        <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
          Producto no encontrado
        </h1>
        <p className="text-sm text-scaps-text-secondary">
          El producto que buscás no existe o ya no está disponible.
        </p>
        <Link
          to="/catalogo"
          className="text-sm font-medium text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
        >
          Volver al catálogo
        </Link>
      </main>
    );
  }

  if (error || (!loading && !product)) {
    return (
      <main
        className={`${pageClassName} items-center justify-center gap-4 text-center`}
      >
        <p role="alert" className="text-sm text-scaps-text-secondary">
          {error?.message ?? 'No se pudo cargar el producto.'}
        </p>
        <button
          type="button"
          onClick={reload}
          className="h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
        >
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <div className={contentClassName}>
        <Breadcrumb name={product?.nombre} />

        {product ? (
          <div className={layoutClassName}>
            <Gallery key={product.slug} product={product} />

            <section className="flex flex-col gap-4">
              <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
                {product.nombre}
              </h1>
              <p className="text-xl font-medium text-scaps-text">
                {formatPrice(product.precio)}
              </p>
              {/* La cantidad no se muestra: solo se avisa cuando no queda. */}
              {product.stock <= 0 && (
                <p className="text-sm text-scaps-text-secondary">Sin stock</p>
              )}
              {product.descripcion && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-scaps-text-secondary">
                  {product.descripcion}
                </p>
              )}
            </section>
          </div>
        ) : (
          <ProductSkeleton />
        )}

        <RelatedProducts currentSlug={slug} />
      </div>
    </main>
  );
}
