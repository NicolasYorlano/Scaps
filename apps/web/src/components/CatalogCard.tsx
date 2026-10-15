import { useId, useState } from 'react';
import { Link } from 'react-router';
import AddToCartButton from './AddToCartButton';
import LowStockBadge from './LowStockBadge';
import ProductImage from './ProductImage';
import SoldOutBadge from './SoldOutBadge';
import { formatPrice } from '../lib/format-price';
import { lowStockLabel } from '../lib/low-stock';
import type { ProductCard } from '../types/product';

// flex-1: dentro de un <li className="flex">, se estira al alto de la fila.
const cardClassName =
  'flex min-w-0 flex-1 flex-col overflow-hidden rounded-scaps border border-scaps-border bg-scaps-card';

// Los dos carteles de stock, en el mismo lugar: arriba a la izquierda de la foto.
const badgeClassName = 'pointer-events-none absolute top-2 left-2 md:top-3 md:left-3';

type Props = {
  product: ProductCard;
  /** El botón de abajo: Agregar al carrito en el catálogo; Ver detalles en "También te puede interesar". */
  action?: 'add' | 'details';
  /** Nivel del título, según dónde va la card (h2 en el catálogo). */
  titleAs?: 'h2' | 'h3';
  /** Primeras cards del catálogo: la foto se pide enseguida. */
  priority?: boolean;
  /** `state` del enlace: con qué búsqueda vuelve la ficha al catálogo. */
  linkState?: unknown;
};

/** Card de producto: la usan el catálogo y los relacionados de la ficha. */
export default function CatalogCard({ product, action = 'details', titleAs: Title = 'h2', priority = false, linkState }: Props) {
  // Lo que el botón supo del stock al agregar vale para esta copia de la grilla:
  // si la grilla se vuelve a pedir, llega otro objeto y manda el dato nuevo.
  const [learned, setLearned] = useState<{ source: ProductCard; stock: number } | null>(null);
  const stock = learned?.source === product ? learned.stock : product.stock;
  const soldOut = stock <= 0;
  const soldOutId = useId();
  const lowStockId = useId();
  // El cartel que se ve lo nombra el enlace: con Tab también se oye (en el celular, el enlace es la única parada).
  const badgeId = soldOut ? soldOutId : lowStockLabel(stock) ? lowStockId : undefined;

  // Un botón no puede ir adentro de un enlace: el enlace es el nombre, y su ::after se estira
  // sobre toda la card (relative) para que se pueda tocar en cualquier parte, como antes.
  // El anillo de foco lo dibuja la card cuando el enlace tiene el foco: así rodea todo.
  return (
    <div
      className={`group relative ${cardClassName} transition-colors hover:border-scaps-border-input has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-scaps-text`}
    >
      {/* El mismo fondo tapa las esquinas de abajo, que ProductImage redondea. */}
      <div
        className={`bg-scaps-photo [&_img]:transition-[scale,opacity] [&_img]:duration-500 [&_img]:ease-out motion-safe:group-hover:[&_img]:scale-105 ${soldOut ? '[&_img]:opacity-70' : ''}`}
      >
        <ProductImage image={product.imagen_principal} aspect="square" decorative priority={priority} />
      </div>

      <div className="flex flex-1 flex-col p-3">
        {/* Tres renglones en el celular: con dos, nombres distintos quedaban cortados igual. */}
        <Title className="line-clamp-3 font-display text-card wrap-break-word text-scaps-text md:line-clamp-2">
          {/* outline-none: el anillo lo dibuja la card. */}
          <Link
            to={`/producto/${product.slug}`}
            state={linkState}
            aria-describedby={badgeId}
            className="outline-none after:absolute after:inset-0 after:rounded-scaps"
          >
            {product.nombre}
          </Link>
        </Title>
        {/* mt-auto: el precio queda a la misma altura en toda la fila. */}
        <p className="mt-auto pt-1 text-sm font-medium text-scaps-text tabular-nums md:mb-3 md:text-base">
          {formatPrice(product.precio)}
        </p>
        {/* Después del precio para que se lea al final; se dibuja sobre la foto y deja pasar el clic al enlace. */}
        {/* Los dos carteles en el mismo lugar y nunca juntos (con 0, LowStockBadge no se dibuja).
            Sobre la foto: no suman alto, así las cards de una fila siguen parejas. */}
        {soldOut && <SoldOutBadge id={soldOutId} className={badgeClassName} />}
        <LowStockBadge id={lowStockId} stock={stock} className={badgeClassName} />
        {action === 'add' ? (
          <AddToCartButton
            product={product}
            stock={stock}
            soldOutId={soldOutId}
            onStockLearned={(next) => setLearned({ source: product, stock: next })}
          />
        ) : (
          // Encima del enlace estirado (relative z-10), para marcarse solo con el mouse encima, como Agregar
          // al carrito. Abre la misma ficha; el nombre ya es el enlace: este no se anuncia ni para el Tab.
          <Link
            to={`/producto/${product.slug}`}
            state={linkState}
            aria-hidden="true"
            tabIndex={-1}
            className="relative z-10 hidden h-10 items-center justify-center rounded-scaps border border-scaps-border-input text-sm font-medium text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary md:flex"
          >
            Ver detalles
          </Link>
        )}
      </div>
    </div>
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
