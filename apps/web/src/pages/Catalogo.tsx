import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import CatalogCard, { CatalogCardSkeleton } from '../components/CatalogCard';
import CatalogToolbar from '../components/CatalogToolbar';
import { useApiQuery } from '../hooks/useApi';
import {hasActiveFilters, parseCatalogFilters, toApiPath, toSearchParams, withoutFilters, type CatalogFilters} from '../lib/catalog-filters';
import { focusField } from '../lib/forms';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

// Divisibles por 4, 3 y 2: la última fila queda completa en todos los anchos.
const PAGE_SIZE = 24;
const SKELETON_COUNT = 12;

const SUMMARY_ID = 'catalog-summary';

const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4';

const actionButtonClassName =
  'h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';

function countLabel(total: number) {
  return total === 1 ? '1 producto' : `${total} productos`;
}

function SkeletonGrid() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando productos…
      </p>
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
    </>
  );
}

function Grid({ products, total }: { products: ProductCard[]; total: number }) {
  const count = `${products.length} de ${countLabel(total)}`;

  return (
    <>
      <ul className={gridClassName}>
        {products.map((product) => (
          // flex: estira la card al alto de la fila.
          <li key={product.id} className="flex">
            <CatalogCard product={product} />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-scaps-text-muted">
        {products.length < total
          ? `Mostrando ${count}`
          : `Fin del catálogo · ${count}`}
      </p>
    </>
  );
}

export default function Catalogo() {
  // Lo aplicado vive en la URL: Atrás desde una ficha y recargar lo conservan.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogFilters(searchParams);
  const { data, error, loading, reload } = useApiQuery<Paginated<ProductCard>>(toApiPath(filters, PAGE_SIZE));
  const filtered = hasActiveFilters(filters);
  const total = data?.meta.total ?? 0;

  useEffect(() => {
    document.title = 'Catálogo | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  function applyFilters(next: CatalogFilters) {
    const search = toSearchParams(next).toString();
    // Sin cambios no se navega: no suma una entrada repetida al historial.
    if (search !== toSearchParams(filters).toString()) setSearchParams(search);
  }

  function clearFilters() {
    applyFilters(withoutFilters(filters));
    // Quien lo tocó desaparece: el foco va al total en vez de perderse.
    // No al buscador, que en el celular abriría el teclado.
    focusField(SUMMARY_ID);
  }

  return (
    <main className="flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12">
      <CatalogToolbar filters={filters} onApply={applyFilters} onClear={clearFilters}>
        <div className="shrink-0">
          {/* mb en em: la "g" baja de la caja del título, y el aire crece con el tamaño de la letra. */}
          <h1 className="mb-[0.25em] font-display text-title text-scaps-text">
            Catálogo
          </h1>
          {/* min-h-5: reserva el renglón del total para que la grilla no salte al cargar. */}
          {/* tabIndex -1: recibe el foco al limpiar los filtros. */}
          <p id={SUMMARY_ID} tabIndex={-1} className="min-h-5 text-sm text-scaps-text-muted">
            {/* aria-live: un lector de pantalla anuncia el resultado de cada filtro. */}
            <span aria-live="polite">{total > 0 && countLabel(total)}</span>
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

      {loading ? (
        <SkeletonGrid />
      ) : error || !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p role="alert" className="text-sm text-scaps-text-secondary">
            {error?.message ?? 'No se pudo cargar el catálogo.'}
          </p>
          <button type="button" onClick={reload} className={actionButtonClassName}>
            Reintentar
          </button>
        </div>
      ) : data.data.length === 0 && filtered ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-sm text-scaps-text-secondary">
            No encontramos productos con esos filtros
          </p>
          <button type="button" onClick={clearFilters} className={actionButtonClassName}>
            Limpiar filtros
          </button>
        </div>
      ) : data.data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-sm text-scaps-text-secondary">
          Todavía no hay productos
        </p>
      ) : (
        <Grid products={data.data} total={data.meta.total} />
      )}
    </main>
  );
}
