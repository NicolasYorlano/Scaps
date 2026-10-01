import { useEffect } from 'react';
import CatalogCard, { CatalogCardSkeleton } from '../components/CatalogCard';
import { useApiQuery } from '../hooks/useApi';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

// Divisibles por 4, 3 y 2: la última fila queda completa en todos los anchos.
const PAGE_SIZE = 24;
const SKELETON_COUNT = 12;

const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4';

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
  const { data, error, loading, reload } = useApiQuery<Paginated<ProductCard>>(
    `/products?limit=${PAGE_SIZE}`,
  );

  useEffect(() => {
    document.title = 'Catálogo | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12">
      <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
        Catálogo
      </h1>
      {/* min-h-5: reserva el renglón del total para que la grilla no salte al cargar. */}
      <p className="mt-1 min-h-5 text-sm text-scaps-text-muted">
        {data && data.meta.total > 0 && countLabel(data.meta.total)}
      </p>

      {loading ? (
        <SkeletonGrid />
      ) : error || !data ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p role="alert" className="text-sm text-scaps-text-secondary">
            {error?.message ?? 'No se pudo cargar el catálogo.'}
          </p>
          <button
            type="button"
            onClick={reload}
            className="h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
          >
            Reintentar
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
