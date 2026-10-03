import { Link } from 'react-router';
import ProductImage from './ProductImage';
import { formatPrice } from '../lib/format-price';
import type { ProductCard } from '../types/product';

// flex-1: dentro de un <li className="flex">, se estira al alto de la fila.
const cardClassName =
  'flex min-w-0 flex-1 flex-col overflow-hidden rounded-scaps border border-scaps-border bg-scaps-card';

type Props = {
  product: ProductCard;
  /** Nivel del título, según dónde va la card (h2 en el catálogo). */
  titleAs?: 'h2' | 'h3';
  /** Primeras cards del catálogo: la foto se pide enseguida. */
  priority?: boolean;
  /** `state` del enlace: con qué búsqueda vuelve la ficha al catálogo. */
  linkState?: unknown;
};

/** Card de producto: la usan el catálogo y los relacionados de la ficha. */
export default function CatalogCard({ product, titleAs: Title = 'h2', priority = false, linkState }: Props) {
  const soldOut = product.stock <= 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      state={linkState}
      className={`group relative ${cardClassName} transition-colors hover:border-scaps-border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scaps-text`}
    >
      {/* El fondo blanco tapa las esquinas de abajo, que ProductImage redondea. */}
      <div
        className={`bg-scaps-photo [&_img]:transition-[scale,opacity] [&_img]:duration-500 [&_img]:ease-out motion-safe:group-hover:[&_img]:scale-105 ${soldOut ? '[&_img]:opacity-70' : ''}`}
      >
        <ProductImage image={product.imagen_principal} aspect="square" decorative priority={priority} />
      </div>

      <div className="flex flex-1 flex-col p-3">
        {/* Tres renglones en el celular: con dos, nombres distintos quedaban cortados igual. */}
        <Title className="line-clamp-3 font-display text-card wrap-break-word text-scaps-text md:line-clamp-2">
          {product.nombre}
        </Title>
        {/* mt-auto: el precio queda a la misma altura en toda la fila. */}
        <p className="mt-auto pt-1 text-sm font-medium text-scaps-text tabular-nums md:mb-3 md:text-base">
          {formatPrice(product.precio)}
        </p>
        {/* Después del precio para que se lea al final; se dibuja sobre la foto. */}
        {soldOut && (
          <span className="absolute top-2 left-2 rounded-full border border-scaps-border-input bg-scaps-canvas px-2 py-0.5 text-[11px] font-medium tracking-wider text-scaps-text-secondary uppercase md:top-3 md:left-3">
            Sin stock
          </span>
        )}
        {/* span y no botón: la card entera ya es el enlace. */}
        <span
          aria-hidden="true"
          className="hidden h-10 items-center justify-center rounded-scaps border border-scaps-border-input text-sm font-medium text-scaps-text-secondary transition-colors group-hover:border-scaps-border-primary group-hover:bg-scaps-card-highlight group-hover:text-scaps-text-on-primary md:flex"
        >
          Ver detalles
        </span>
      </div>
    </Link>
  );
}

/** Mismo alto que una card real (nombre en dos renglones en el celular, uno desde md): nada salta al cargar. */
export function CatalogCardSkeleton() {
  return (
    <div className={cardClassName}>
      <div className="aspect-square bg-scaps-placeholder" />
      <div className="flex flex-1 flex-col p-3">
        {/* text-card + h-lh: cada barra mide un renglón del nombre. */}
        <div className="flex h-lh items-center text-card">
          <div className="h-[0.6em] w-3/4 rounded-full bg-scaps-placeholder" />
        </div>
        <div className="flex h-lh items-center text-card md:hidden">
          <div className="h-[0.6em] w-1/2 rounded-full bg-scaps-placeholder" />
        </div>
        {/* Las clases de letra del precio + h-lh: la barra mide su renglón. */}
        <div className="mt-1 flex h-lh items-center text-sm md:mb-3 md:text-base">
          <div className="h-3 w-1/3 rounded-full bg-scaps-placeholder" />
        </div>
        <div className="mt-auto hidden h-10 rounded-scaps bg-scaps-placeholder md:block" />
      </div>
    </div>
  );
}
