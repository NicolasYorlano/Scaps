import { useLocation } from 'react-router';
import CatalogCard, { CatalogCardSkeleton } from './CatalogCard';
import { useApiQuery } from '../hooks/useApi';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

const MAX_RELATED = 4;
// De dónde se eligen: los más recientes que tienen stock.
const CANDIDATES = 24;

// Entre md y lg entran tres por fila: el cuarto se oculta para no dejar una fila con una sola card.
const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 md:max-lg:[&>li:nth-child(n+4)]:hidden! lg:grid-cols-4';

type Props = {
  /** La ficha en la que se está: no se recomienda a sí misma y la lista arranca después de ella. */
  currentSlug?: string;
  /** Los que no se muestran: en el carrito, los que ya están adentro. */
  excludeSlugs?: string[];
};

/** Otros productos, al pie de la ficha. Si no hay ninguno o el pedido falla, no se muestra. */
export default function RelatedProducts({currentSlug, excludeSlugs = []}: Props) {
  // keep: de una ficha a otra la lista es la misma y se ve al instante.
  const { data, loading } = useApiQuery<Paginated<ProductCard>>(`/products?limit=${CANDIDATES}&en_stock=true`, { keep: true });
  // De una ficha a otra, la miga sigue volviendo a la misma búsqueda del catálogo.
  const linkState: unknown = useLocation().state;
  const candidates = data?.data ?? [];
  // Los que siguen al de la ficha, dando la vuelta: cada ficha recomienda otros.
  // Sin ficha (en el carrito) no hay desde dónde arrancar: quedan en el orden en que llegan.
  const next = candidates.findIndex((product) => product.slug === currentSlug) + 1;
  const products = [...candidates.slice(next), ...candidates.slice(0, next)]
    .filter((product) => product.slug !== currentSlug && !excludeSlugs.includes(product.slug))
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
