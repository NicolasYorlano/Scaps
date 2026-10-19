import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import AlertIcon from '../components/AlertIcon';
import LineNotice from '../components/LineNotice';
import ProductImage from '../components/ProductImage';
import { useApiQuery } from '../hooks/useApi';
import { api, toApiError, type ApiError } from '../lib/api';
import { formatPrice } from '../lib/format-price';
import { focusField } from '../lib/forms';
import { panelNotice } from '../lib/panel-notice';
import type { Paginated } from '../types/pagination';
import type { GalleryImage, ProductDetail } from '../types/product';

// Su propia tanda, como la del catálogo: el listado no tiene filtros.
const PAGE_SIZE = 24;
const SKELETON_COUNT = 4;

const TITLE_ID = 'panel-title';
const FOOTER_ID = 'panel-footer';
const LOAD_MORE_ID = 'panel-load-more';

const NEW_PRODUCT_PATH = '/admin/productos/nuevo';

const pageClassName = 'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';
// Centrada, con el mismo ancho que el carrito.
const contentClassName = 'mx-auto flex w-full max-w-311 flex-col';

const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
const secondaryButtonClassName =
  'flex items-center justify-center rounded-scaps border border-scaps-border-input text-sm font-medium text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary';

// Desde lg, una tabla armada como las líneas del carrito; antes, una tarjeta por producto.
// Las columnas del encabezado coinciden con las de una fila.
const columnsClassName = 'lg:grid-cols-[4rem_minmax(0,1fr)_8rem_9rem_10rem_auto] lg:gap-x-6';
// La tabla: una card con las filas separadas. Debajo de lg, el contenedor no se dibuja.
const tableClassName = 'mt-6 lg:rounded-scaps lg:border lg:border-scaps-border lg:bg-scaps-card';
const headerClassName = `hidden rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight px-6 py-3 text-xs font-medium tracking-wider text-scaps-text-muted uppercase lg:grid ${columnsClassName}`;
const listClassName = 'flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-scaps-border-row';
//   tarjeta: la imagen a la izquierda, los datos al lado y las acciones abajo, a todo el ancho
//   lg: una sola fila; los datos ocupan cada uno su columna (lg:contents)
const rowClassName = `grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 rounded-scaps border border-scaps-border bg-scaps-card p-4 lg:items-center lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 lg:py-4 ${columnsClassName}`;
const imageCellClassName = 'col-start-1 row-start-1';
const infoCellClassName = 'col-start-2 row-start-1 flex min-w-0 flex-col items-start gap-1.5 lg:contents';
const actionsCellClassName = 'col-span-2 lg:col-span-1 lg:justify-self-end';

// La forma de los carteles de la tienda (SoldOutBadge). Destacado, invertido como LowStockBadge:
// es el que se busca de un vistazo.
const badgeClassName =
  'rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wider whitespace-nowrap uppercase';
const inactiveBadgeClassName = `${badgeClassName} border-scaps-border-input bg-scaps-canvas text-scaps-text-secondary`;
const featuredBadgeClassName = `${badgeClassName} border-scaps-page/15 bg-scaps-text text-scaps-page`;

function countLabel(total: number) {
  return total === 1 ? '1 producto' : `${total} productos`;
}

function footerText(shown: number, total: number) {
  return `Mostrando ${shown} de ${countLabel(total)}`;
}

function pagePath(page: number) {
  return `/admin/products?limit=${PAGE_SIZE}&page=${page}`;
}

/** La portada; si faltara, la primera de la galería. Sin ninguna, null: la fila no se rompe. */
function coverImage(product: ProductDetail): GalleryImage | null {
  return product.imagenes.find((image) => image.es_principal) ?? product.imagenes[0] ?? null;
}

type ProductPage = Paginated<ProductDetail>;
type Meta = ProductPage['meta'];

// Las tandas que suma Cargar más, después de la primera. `source` es la primera tanda:
// si se vuelve a pedir (Reintentar), lo cargado se descarta.
type More = {
  source: ProductPage | null;
  items: ProductDetail[];
  meta: Meta | null;
  loading: boolean;
  error: ApiError | null;
};

function emptyMore(source: ProductPage | null): More {
  return { source, items: [], meta: null, loading: false, error: null };
}

/** Cargar más: pide la página siguiente y la suma a la lista. Una versión simple de la del catálogo, sin filtros. */
function useLoadMore(first: ProductPage | null) {
  const [state, setState] = useState<More>(() => emptyMore(first));
  // Dos clics seguidos no piden dos veces la misma página.
  const inFlight = useRef<ProductPage | null>(null);

  let current = state;
  if (state.source !== first) {
    current = emptyMore(first);
    setState(current);
  }

  // La primera tanda que está en pantalla: un pedido que vuelve la compara con la suya.
  const liveSource = useRef(current.source);
  useLayoutEffect(() => {
    liveSource.current = current.source;
  }, [current.source]);

  async function loadMore(page: number): Promise<Meta | null> {
    const { source } = current;
    if (source === null || inFlight.current === source) return null;
    inFlight.current = source;
    setState((prev) => (prev.source === source ? { ...prev, loading: true, error: null } : prev));

    try {
      const next = await api.get<ProductPage>(pagePath(page));
      setState((prev) =>
        prev.source === source
          ? { ...prev, items: [...prev.items, ...next.data], meta: next.meta, loading: false }
          : prev,
      );
      // Si la primera tanda se volvió a pedir, esta se descartó: no hay nada que informar.
      return liveSource.current === source ? next.meta : null;
    } catch (e) {
      const error = toApiError(e);
      setState((prev) => (prev.source === source ? { ...prev, loading: false, error } : prev));
      return null;
    } finally {
      if (inFlight.current === source) inFlight.current = null;
    }
  }

  return { ...current, loadMore };
}

/** Las tandas pegadas, sin repetidos: si entra un producto entre una y otra, el último de la anterior se corre a la siguiente. */
function mergePages(first: ProductDetail[], more: ProductDetail[]): ProductDetail[] {
  if (more.length === 0) return first;
  const seen = new Set(first.map((product) => product.id));
  const added = more.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
  return [...first, ...added];
}

function Stock({ stock }: { stock: number }) {
  // El stock en 0 es lo que hay que atender: lo marca el ícono, no un color.
  if (stock <= 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-scaps-text tabular-nums">
        <AlertIcon className="h-4 w-4 shrink-0" />
        <span>
          <span className="lg:sr-only">Stock: </span>0 · Sin stock
        </span>
      </p>
    );
  }

  return (
    <p className="text-sm text-scaps-text-secondary tabular-nums">
      <span className="text-scaps-text-muted lg:sr-only">Stock: </span>
      {stock}
    </p>
  );
}

function ProductRow({ product }: { product: ProductDetail }) {
  const image = coverImage(product);
  const inactive = !product.activo;
  // Dado de baja se ve apagado; el cartel y Editar no, que se leen y se usan igual.
  const dimClassName = inactive ? 'opacity-60' : '';

  return (
    <li className={rowClassName}>
      <div className={`${imageCellClassName} ${inactive ? 'opacity-50' : ''}`}>
        {image ? (
          <ProductImage image={image} aspect="square" decorative />
        ) : (
          <span className="block aspect-square rounded-scaps bg-scaps-placeholder" />
        )}
      </div>

      <div className={infoCellClassName}>
        <h2 className={`line-clamp-3 font-display text-card wrap-break-word text-scaps-text lg:line-clamp-2 ${dimClassName}`}>
          {product.nombre}
        </h2>
        <p className={`text-sm font-medium text-scaps-text tabular-nums ${dimClassName}`}>
          <span className="sr-only">Precio: </span>
          {formatPrice(product.precio)}
        </p>
        <div className={dimClassName}>
          <Stock stock={product.stock} />
        </div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-scaps-text-secondary">
          <span className="sr-only">Estado: </span>
          {inactive ? <span className={inactiveBadgeClassName}>Inactivo</span> : <span>Activo</span>}
          {product.destacado && <span className={featuredBadgeClassName}>Destacado</span>}
        </p>
      </div>

      <div className={actionsCellClassName}>
        <Link
          to={`/admin/productos/${product.id}`}
          className={`${secondaryButtonClassName} h-11 w-full px-4 lg:h-10 lg:w-auto`}
        >
          Editar
          <span className="sr-only"> {product.nombre}</span>
        </Link>
      </div>
    </li>
  );
}

// Misma forma que el listado cargado: nada salta cuando llega.
function ListSkeleton() {
  return (
    <div aria-hidden="true" className={`${tableClassName} motion-safe:animate-pulse`}>
      <div className="box-content hidden h-10 rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight lg:block" />
      <ul className={listClassName}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <li key={i} className={rowClassName}>
            <div className={`${imageCellClassName} aspect-square rounded-scaps bg-scaps-placeholder`} />
            {/* Con las clases de letra de cada dato + h-lh, cada barra mide su renglón. */}
            <div className={infoCellClassName}>
              <div className="flex h-lh w-full items-center text-card">
                <div className="h-4 w-3/4 rounded-full bg-scaps-placeholder" />
              </div>
              <div className="flex h-lh w-full items-center text-sm">
                <div className="h-3 w-20 rounded-full bg-scaps-placeholder" />
              </div>
              <div className="flex h-lh w-full items-center text-sm">
                <div className="h-3 w-16 rounded-full bg-scaps-placeholder" />
              </div>
              <div className="flex h-lh w-full items-center text-sm">
                <div className="h-3 w-14 rounded-full bg-scaps-placeholder" />
              </div>
            </div>
            <div className={actionsCellClassName}>
              <div className="h-11 w-full rounded-scaps bg-scaps-placeholder lg:h-10 lg:w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Portada del panel: todos los productos, activos e inactivos. La ruta está protegida con RequireAdmin. */
export default function Admin() {
  const { data, error, loading, reload } = useApiQuery<ProductPage>(pagePath(1));
  // 404: no hay destacado. Si falla por otro motivo, el aviso no aparece y el listado sigue.
  const featured = useApiQuery<ProductDetail>('/products/featured');
  const more = useLoadMore(data);

  const location = useLocation();
  const navigate = useNavigate();
  // El aviso con el que llegó la navegación. Se lee una vez: del historial se limpia enseguida.
  const [notice] = useState(() => panelNotice(location.state));

  const products = data ? mergePages(data.data, more.items) : [];
  const meta = more.meta ?? data?.meta ?? null;
  const total = meta?.total ?? 0;
  const hasMore = meta !== null && meta.page < meta.total_pages;
  const noFeatured = featured.error?.status === 404;

  // Lo que oye un lector de pantalla: pasa por "Cargando" y siempre termina en un resultado.
  const status = loading
    ? 'Cargando productos…'
    : more.loading
      ? 'Cargando más productos…'
      : more.items.length > 0
        ? footerText(products.length, total)
        : '';

  useEffect(() => {
    // Así no vuelve a aparecer al recargar.
    if (panelNotice(location.state) !== null) void navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    document.title = 'Panel | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  async function loadMore() {
    if (!meta) return;
    const next = await more.loadMore(meta.page + 1);
    // Era la última tanda: el botón desaparece y el foco va al pie, en vez de perderse.
    if (next && next.page >= next.total_pages && document.activeElement?.id === LOAD_MORE_ID) {
      focusField(FOOTER_ID);
    }
  }

  function retry() {
    reload();
    // El botón desaparece al reintentar: el foco va al título en vez de perderse.
    focusField(TITLE_ID);
  }

  return (
    <main data-stable-scrollbar className={pageClassName}>
      <div className={contentClassName}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            {/* mb en em: la "g" de otros títulos baja de la caja; mismo aire que el catálogo. */}
            <h1 id={TITLE_ID} tabIndex={-1} className="mb-[0.25em] font-display text-title text-scaps-text outline-none">
              Productos
            </h1>
            {/* min-h-5: reserva el renglón del total para que nada salte al cargar. */}
            <p className="min-h-5 text-sm text-scaps-text-muted">{data && countLabel(data.meta.total)}</p>
          </div>
          <Link to={NEW_PRODUCT_PATH} className={`${primaryButtonClassName} w-full sm:w-auto`}>
            Nuevo producto
          </Link>
        </div>

        {(notice || noFeatured) && (
          <div className="mt-6 flex flex-col gap-3">
            {notice && (
              <p
                role="status"
                className="rounded-scaps border border-scaps-border-input bg-scaps-card-highlight px-3.5 py-3 text-sm text-scaps-text"
              >
                {notice}
              </p>
            )}
            {noFeatured && (
              <LineNotice>No hay un producto destacado: la landing muestra la imagen fija hasta que elijas uno</LineNotice>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton />
        ) : error || !data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <p role="alert" className="text-sm text-scaps-text-secondary">
              {error?.message ?? 'No se pudieron cargar los productos.'}
            </p>
            <button type="button" onClick={retry} className={primaryButtonClassName}>
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-sm text-scaps-text-secondary">Todavía no hay productos</p>
            <Link to={NEW_PRODUCT_PATH} className={primaryButtonClassName}>
              Nuevo producto
            </Link>
          </div>
        ) : (
          <>
            <section aria-labelledby={TITLE_ID} className={tableClassName}>
              {/* Solo a la vista: cada fila ya nombra lo suyo para un lector de pantalla. */}
              <div aria-hidden="true" className={headerClassName}>
                <span className="col-span-2">Producto</span>
                <span>Precio</span>
                <span>Stock</span>
                <span>Estado</span>
              </div>
              {/* El orden de la API por defecto: los más recientes primero. */}
              <ul className={listClassName}>
                {products.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </ul>
            </section>

            {hasMore && (
              <div className="mt-8 flex flex-col items-center gap-3">
                {more.error && (
                  <p role="alert" className="text-center text-sm text-scaps-text-secondary">
                    No pudimos cargar más productos. {more.error.message}
                  </p>
                )}
                {/* aria-disabled y no disabled: un botón deshabilitado suelta el foco. */}
                <button
                  id={LOAD_MORE_ID}
                  type="button"
                  aria-disabled={more.loading}
                  onClick={() => void loadMore()}
                  className={`${primaryButtonClassName} w-full gap-2 md:w-auto ${more.loading ? 'cursor-progress' : ''}`}
                >
                  {more.loading && (
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
                    />
                  )}
                  {more.loading ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
            {/* tabIndex -1: recibe el foco cuando Cargar más trae la última tanda y desaparece. */}
            <p id={FOOTER_ID} tabIndex={-1} className="mt-8 text-center text-sm text-scaps-text-muted">
              {footerText(products.length, total)}
            </p>
          </>
        )}

        {/* Siempre montado: un lector de pantalla anuncia cada carga y su resultado. */}
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </main>
  );
}
