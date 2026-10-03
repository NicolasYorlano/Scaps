import { useLocation } from 'react-router';
import CatalogCard, { CatalogCardSkeleton } from './CatalogCard';
import { useApiQuery } from '../hooks/useApi';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

const MAX_RELATED = 4;

const gridClassName = 'mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6';

/** Otros productos, al pie de la ficha. Si no hay ninguno o el pedido falla, no se muestra. */
export default function RelatedProducts({currentSlug}: {currentSlug: string}) {
  // Uno de más: el de la ficha se saca de la lista.
  const { data, loading } = useApiQuery<Paginated<ProductCard>>(
    `/products?limit=${MAX_RELATED + 1}`,
  );
  // De una ficha a otra, la miga sigue volviendo a la misma búsqueda del catálogo.
  const linkState: unknown = useLocation().state;
  const products = (data?.data ?? [])
    .filter((product) => product.slug !== currentSlug)
    .slice(0, MAX_RELATED);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-16 lg:mt-24">
      <h2 className="font-display text-heading text-scaps-text">
        También te puede interesar
      </h2>
      {loading ? (
        <ul
          aria-hidden="true"
          className={`${gridClassName} motion-safe:animate-pulse`}
        >
          {Array.from({ length: MAX_RELATED }, (_, i) => (
            <li key={i} className="flex">
              <CatalogCardSkeleton />
            </li>
          ))}
        </ul>
      ) : (
        <ul className={gridClassName}>
          {products.map((product) => (
            <li key={product.id} className="flex">
              <CatalogCard product={product} titleAs="h3" linkState={linkState} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
