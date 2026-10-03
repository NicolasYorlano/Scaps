import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import CatalogCard, { CatalogCardSkeleton } from '../components/CatalogCard';
import CatalogToolbar from '../components/CatalogToolbar';
import { useApiQuery } from '../hooks/useApi';
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

const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-6 lg:mt-4 lg:grid-cols-4';

const actionButtonClassName =
  'h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';

function countLabel(total: number) {
  return total === 1 ? '1 producto' : `${total} productos`;
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
};

function Grid({ products, total, busy, filtered, linkState }: GridProps) {
  const count = `${products.length} de ${countLabel(total)}`;

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
      <p className="mt-8 text-center text-sm text-scaps-text-muted">
        {products.length < total
          ? `Mostrando ${count}`
          : `${filtered ? 'Fin de los resultados' : 'Fin del catálogo'} · ${count}`}
      </p>
    </div>
  );
}

export default function Catalogo() {
  // Lo aplicado vive en la URL: Atrás desde una ficha y recargar lo conservan.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogFilters(searchParams);
  // keep: al volver de una ficha la grilla está al instante y el navegador restaura el scroll.
  const { data, error, loading, previousData, reload } = useApiQuery<Paginated<ProductCard>>(toApiPath(filters, PAGE_SIZE), { keep: true });
  const filtered = hasActiveFilters(filters);
  // Mientras llega otra búsqueda se sigue viendo la anterior, en vez de vaciar la pantalla.
  const shown = data ?? (loading ? previousData : null);
  const total = shown?.meta.total ?? 0;
  const noResults = data !== null && data.data.length === 0;
  const onlySearch = filters.q !== '' && countPanelFilters(filters) === 0;
  const search = toSearchParams(filters).toString();

  // Lo que oye un lector de pantalla: pasa por "Cargando" y siempre termina en un resultado.
  const status = loading
    ? 'Cargando productos…'
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
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="mr-1 inline-block h-3.5 w-3.5 align-[-2px] fill-none stroke-current stroke-[1.25]"
                    >
                      <path d="M8 1.5l5.5 3.25v6.5L8 14.5l-5.5-3.25v-6.5L8 1.5zM2.5 4.75L8 8l5.5-3.25M8 8v6.5" strokeLinejoin="round" />
                    </svg>
                    {total === 1 ? 'Miralo en 3D' : 'Elegí uno y miralo en 3D'}
                  </span>
                </>
              )}
            </p>
          </div>
        </CatalogToolbar>

        {shown && shown.data.length > 0 ? (
          <Grid
            products={shown.data}
            total={shown.meta.total}
            busy={data === null}
            filtered={filtered}
            linkState={catalogState(search)}
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
