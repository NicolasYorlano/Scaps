import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import CatalogCard, { CatalogCardSkeleton } from '../components/CatalogCard';
import CatalogToolbar from '../components/CatalogToolbar';
import CubeIcon from '../components/CubeIcon';
import { toApiError, useApiQuery } from '../hooks/useApi';
import { api, type ApiError } from '../lib/api';
import {countPanelFilters, hasActiveFilters, parseCatalogFilters, toApiPath, toSearchParams, withoutFilters, type CatalogFilters} from '../lib/catalog-filters';
import { catalogState } from '../lib/catalog-return';
import { focusField } from '../lib/forms';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

// Divisibles por 4, 3 y 2: la última fila queda completa en todos los anchos.
const PAGE_SIZE = 24;
const SKELETON_COUNT = 12;
// La primera fila en escritorio: sus fotos se piden enseguida.
const PRIORITY_COUNT = 4;

const SUMMARY_ID = 'catalog-summary';
const FOOTER_ID = 'catalog-footer';
const LOAD_MORE_ID = 'catalog-load-more';

const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-6 lg:mt-4 lg:grid-cols-4';

const actionButtonClassName =
  'h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';

function countLabel(total: number) {
  return total === 1 ? '1 producto' : `${total} productos`;
}

function footerText(shown: number, total: number, filtered: boolean) {
  const count = `${shown} de ${countLabel(total)}`;
  return shown < total
    ? `Mostrando ${count}`
    : `${filtered ? 'Fin de los resultados' : 'Fin del catálogo'} · ${count}`;
}

type Meta = Paginated<ProductCard>['meta'];

// Las tandas que suma Cargar más, después de la primera. `session` cambia con
// la búsqueda: lo que llegue de una sesión anterior se descarta.
type More = {
  base: string;
  session: number;
  items: ProductCard[];
  meta: Meta | null;
  loading: boolean;
  error: ApiError | null;
};

function emptyMore(base: string, session: number): More {
  return { base, session, items: [], meta: null, loading: false, error: null };
}

/**
 * Cargar más: pide la página siguiente y la suma a la lista. Si cambia la
 * búsqueda, un filtro o el orden (`firstPath`), lo cargado se descarta y la
 * lista vuelve a la primera tanda.
 */
function useLoadMore(filters: CatalogFilters, firstPath: string) {
  const [state, setState] = useState<More>(() => emptyMore(firstPath, 0));
  // Dos clics seguidos no piden dos veces la misma página.
  const inFlight = useRef<number | null>(null);

  // Otra búsqueda: se vuelve a la primera tanda, también al regresar a una anterior con Atrás.
  let current = state;
  if (state.base !== firstPath) {
    current = emptyMore(firstPath, state.session + 1);
    setState(current);
  }

  async function loadMore(page: number): Promise<Meta | null> {
    const { session } = current;
    if (inFlight.current === session) return null;
    inFlight.current = session;
    setState((prev) => (prev.session === session ? { ...prev, loading: true, error: null } : prev));

    try {
      const next = await api.get<Paginated<ProductCard>>(toApiPath(filters, PAGE_SIZE, page));
      setState((prev) =>
        prev.session === session
          ? { ...prev, items: [...prev.items, ...next.data], meta: next.meta, loading: false }
          : prev,
      );
      return next.meta;
    } catch (e) {
      const error = toApiError(e);
      setState((prev) => (prev.session === session ? { ...prev, loading: false, error } : prev));
      return null;
    } finally {
      if (inFlight.current === session) inFlight.current = null;
    }
  }

  return { ...current, loadMore };
}

/** Las tandas pegadas, sin repetidos: si entra un producto entre una y otra, el último de la anterior se corre a la siguiente. */
function mergePages(first: ProductCard[], more: ProductCard[]): ProductCard[] {
  if (more.length === 0) return first;
  const seen = new Set(first.map((product) => product.id));
  const added = more.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
  return [...first, ...added];
}

function SkeletonGrid() {
  return (
    <ul
      aria-hidden="true"
      className={`${gridClassName} motion-safe:animate-pulse`}
    >
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <li key={i} className="flex">
          <CatalogCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

type GridProps = {
  products: ProductCard[];
  total: number;
  /** Son los resultados anteriores: los nuevos están en camino. */
  busy: boolean;
  filtered: boolean;
  linkState: unknown;
  /** Quedan páginas por pedir. */
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: ApiError | null;
  onLoadMore: () => void;
};

function Grid({ products, total, busy, filtered, linkState, hasMore, loadingMore, loadMoreError, onLoadMore }: GridProps) {
  return (
    // delay-150: una respuesta rápida no llega a atenuar la grilla.
    <div
      aria-busy={busy}
      className={`transition-opacity duration-200 motion-reduce:transition-none ${busy ? 'opacity-60 delay-150' : ''}`}
    >
      <ul className={gridClassName}>
        {products.map((product, i) => (
          // flex: estira la card al alto de la fila.
          <li key={product.id} className="flex">
            <CatalogCard product={product} priority={i < PRIORITY_COUNT} linkState={linkState} />
          </li>
        ))}
      </ul>
      {/* Mientras llega otra búsqueda no: la lista de abajo ya no es la que se mira. */}
      {hasMore && !busy && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {loadMoreError && (
            <p role="alert" className="text-center text-sm text-scaps-text-secondary">
              No pudimos cargar más productos. {loadMoreError.message}
            </p>
          )}
          {/* aria-disabled y no disabled: un botón deshabilitado suelta el foco. */}
          <button
            id={LOAD_MORE_ID}
            type="button"
            aria-disabled={loadingMore}
            onClick={onLoadMore}
            className={`${actionButtonClassName} flex w-full items-center justify-center gap-2 md:w-auto ${loadingMore ? 'cursor-progress' : ''}`}
          >
            {loadingMore && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
              />
            )}
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
      {/* tabIndex -1: recibe el foco cuando Cargar más trae la última tanda y desaparece. */}
      <p id={FOOTER_ID} tabIndex={-1} className="mt-8 text-center text-sm text-scaps-text-muted">
        {footerText(products.length, total, filtered)}
      </p>
    </div>
  );
}

export default function Catalogo() {
  // Lo aplicado vive en la URL: Atrás desde una ficha y recargar lo conservan.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogFilters(searchParams);
  // keep: al volver de una ficha la grilla está al instante y el navegador restaura el scroll.
  const firstPath = toApiPath(filters, PAGE_SIZE);
  const { data, error, loading, previousData, reload } = useApiQuery<Paginated<ProductCard>>(firstPath, { keep: true });
  const more = useLoadMore(filters, firstPath);
  const filtered = hasActiveFilters(filters);
  // Mientras llega otra búsqueda se sigue viendo la anterior, en vez de vaciar la pantalla.
  const shown = data ?? (loading ? previousData : null);
  // Las tandas de Cargar más solo se suman a la primera de su misma búsqueda.
  const products = data ? mergePages(data.data, more.items) : (shown?.data ?? []);
  const meta = (data && more.meta) ?? shown?.meta ?? null;
  const total = meta?.total ?? 0;
  const hasMore = meta !== null && meta.page < meta.total_pages;
  const noResults = data !== null && data.data.length === 0;
  const onlySearch = filters.q !== '' && countPanelFilters(filters) === 0;
  const search = toSearchParams(filters).toString();

  // Lo que oye un lector de pantalla: pasa por "Cargando" y siempre termina en un resultado.
  const status = loading
    ? 'Cargando productos…'
    : more.loading
      ? 'Cargando más productos…'
      : more.items.length > 0
        ? footerText(products.length, total, filtered)
        : noResults
          ? filtered
            ? 'Sin resultados'
            : 'Todavía no hay productos'
          : data
            ? countLabel(total)
            : '';

  const query = filters.q;
  useEffect(() => {
    document.title = query ? `“${query}” en el catálogo | Scaps` : 'Catálogo | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, [query]);

  function applyFilters(next: CatalogFilters, { replace = false } = {}) {
    const nextSearch = toSearchParams(next).toString();
    // Sin cambios no se navega: no suma una entrada repetida al historial.
    if (nextSearch !== search) setSearchParams(nextSearch, { replace });
  }

  async function loadMore() {
    if (!meta) return;
    const next = await more.loadMore(meta.page + 1);
    // Era la última tanda: el botón desaparece y el foco va al pie, en vez de perderse.
    if (next && next.page >= next.total_pages && document.activeElement?.id === LOAD_MORE_ID) {
      focusField(FOOTER_ID);
    }
  }

  function focusSummary() {
    focusField(SUMMARY_ID);
  }

  function clearFilters() {
    applyFilters(withoutFilters(filters));
    // Quien lo tocó desaparece: el foco va al total en vez de perderse.
    // No al buscador, que en el celular abriría el teclado.
    focusSummary();
  }

  return (
    <main data-stable-scrollbar className="flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:pb-12">
      {/* El padding queda afuera: el contenido se centra con el mismo tope que la barra y el pie. */}
      <div className="mx-auto flex w-full max-w-page flex-1 flex-col">
        <CatalogToolbar filters={filters} onApply={applyFilters} onClear={clearFilters} onFocusResults={focusSummary}>
          <div className="shrink-0">
            {/* mb en em: la "g" baja de la caja del título, y el aire crece con el tamaño de la letra. */}
            <h1 className="mb-[0.25em] font-display text-title text-scaps-text">
              Catálogo
            </h1>
            {/* min-h-5: reserva el renglón del total para que la grilla no salte al cargar. */}
            {/* tabIndex -1: recibe el foco al limpiar los filtros. */}
            <p id={SUMMARY_ID} tabIndex={-1} className="min-h-5 text-sm text-scaps-text-muted">
              {total > 0 ? countLabel(total) : noResults && filtered && 'Sin resultados'}
              {/* Todos los productos tienen modelo 3D: se dice una vez acá, no en cada card. */}
              {total > 0 && (
                <>
                  {' · '}
                  <span className="font-medium whitespace-nowrap text-scaps-text">
                    <CubeIcon className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />
                    {total === 1 ? 'Miralo en 3D' : 'Elegí uno y miralo en 3D'}
                  </span>
                </>
              )}
            </p>
          </div>
        </CatalogToolbar>

        {products.length > 0 ? (
          <Grid
            products={products}
            total={total}
            busy={data === null}
            filtered={filtered}
            linkState={catalogState(search)}
            hasMore={hasMore}
            loadingMore={more.loading}
            loadMoreError={more.error}
            onLoadMore={() => void loadMore()}
          />
        ) : loading ? (
          <SkeletonGrid />
        ) : error || !data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p role="alert" className="text-sm text-scaps-text-secondary">
              {error?.message ?? 'No se pudo cargar el catálogo.'}
            </p>
            {/* El botón desaparece al reintentar: el foco va al total. */}
            <button
              type="button"
              onClick={() => {
                reload();
                focusSummary();
              }}
              className={actionButtonClassName}
            >
              Reintentar
            </button>
          </div>
        ) : filtered ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
            <p className="max-w-md text-sm wrap-break-word text-scaps-text-secondary">
              {onlySearch
                ? `No encontramos productos para “${filters.q}”`
                : 'No encontramos productos con esos filtros'}
            </p>
            <button type="button" onClick={clearFilters} className={actionButtonClassName}>
              {onlySearch ? 'Ver todo el catálogo' : 'Limpiar filtros'}
            </button>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-center text-sm text-scaps-text-secondary">
            Todavía no hay productos
          </p>
        )}

        {/* Siempre montado: un lector de pantalla anuncia cada carga y su resultado. */}
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </main>
  );
}
