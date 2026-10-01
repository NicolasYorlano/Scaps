import { useEffect } from 'react';
import { Link } from 'react-router';
import ProductImage from '../components/ProductImage';
import { useApiQuery } from '../hooks/useApi';
import { formatPrice } from '../lib/format-price';
import type { Paginated } from '../types/pagination';
import type { ProductCard } from '../types/product';

// Divisibles por 4, 3 y 2: la última fila queda completa en todos los anchos.
const PAGE_SIZE = 24;
const SKELETON_COUNT = 12;

const gridClassName =
  'mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4';

const cardClassName =
  'flex min-w-0 flex-1 flex-col overflow-hidden rounded-scaps border border-scaps-border bg-scaps-card';

function countLabel(total: number) {
  return total === 1 ? '1 producto' : `${total} productos`;
}

function Card({ product }: { product: ProductCard }) {
  const soldOut = product.stock <= 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className={`group ${cardClassName} transition-colors hover:border-scaps-border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scaps-text`}
    >
      {/* El fondo blanco tapa las esquinas de abajo, que ProductImage redondea. */}
      <div
        className={`relative bg-scaps-photo [&_img]:transition-[scale,opacity] [&_img]:duration-500 [&_img]:ease-out motion-safe:group-hover:[&_img]:scale-105 ${soldOut ? '[&_img]:opacity-50' : ''}`}
      >
        <ProductImage image={product.imagen_principal} aspect="square" />
        {soldOut && (
          <span className="absolute top-2 left-2 rounded-full border border-scaps-border-input bg-scaps-canvas px-2 py-0.5 text-[11px] font-medium tracking-wider text-scaps-text-secondary uppercase md:top-3 md:left-3">
            Sin stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 text-sm font-medium wrap-break-word text-scaps-text">
          {product.nombre}
        </h2>
        <p className="mt-1 text-sm text-scaps-text-muted tabular-nums md:mb-3">
          {formatPrice(product.precio)}
        </p>
        {/* span y no botón: la card entera ya es el enlace. */}
        <span className="mt-auto hidden h-10 items-center justify-center rounded-scaps border border-scaps-border-input text-sm font-medium text-scaps-text-secondary transition-colors group-hover:border-scaps-border-primary group-hover:bg-scaps-card-highlight group-hover:text-scaps-text-on-primary md:flex">
          Ver detalles
        </span>
      </div>
    </Link>
  );
}

// Mismo alto que una card real (nombre en dos renglones en el celular, uno desde md): la grilla no salta al cargar.
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
          <li key={i} className={cardClassName}>
            <div className="aspect-square bg-scaps-placeholder" />
            <div className="flex flex-1 flex-col p-3">
              <div className="my-1 h-3 w-3/4 rounded-full bg-scaps-placeholder" />
              <div className="my-1 h-3 w-1/2 rounded-full bg-scaps-placeholder md:hidden" />
              <div className="mt-2 mb-1 h-3 w-1/3 rounded-full bg-scaps-placeholder md:mb-4" />
              <div className="mt-auto hidden h-10 rounded-scaps bg-scaps-placeholder md:block" />
            </div>
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
            <Card product={product} />
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
