import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router';
import ProductImage from '../components/ProductImage';
import { isCheckoutReady } from '../lib/cart';
import { formatPrice } from '../lib/format-price';
import { focusField } from '../lib/forms';
import { useCartStore } from '../stores/cart-store';
import type { Cart } from '../types/cart';

// Cierre del recorrido del MVP. No hay orden en la base (el checkout real llega después), así que
// esta pantalla no afirma que se compró nada: nada de "compra confirmada" ni un número de pedido.
// Lo que sí es cierto: el carrito se guarda por usuario y queda intacto.

const TITLE_ID = 'order-title';

const pageClassName = 'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 md:py-16';
// Card centrada de 520 px, como el resultado de pago de la guía; en el celular, a todo el ancho.
const cardClassName = 'mx-auto w-full max-w-130 rounded-scaps border border-scaps-border bg-scaps-card p-5 md:p-8';

const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
const secondaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-input px-6 text-sm font-medium text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:text-scaps-text';

/** Un comprobante y no un tilde: un tilde se lee como "pago aprobado", y no hubo pago. */
function ReceiptIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={`fill-none stroke-current stroke-[1.25] ${className}`}>
      <path
        d="M3.5 1.75h9v12.5l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1zM5.75 5h4.5M5.75 7.5h4.5M5.75 10h2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderSummary({ cart }: { cart: Cart }) {
  return (
    <>
      {/* 44 px, como el ícono del resultado de pago de la guía. */}
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-scaps-border-input text-scaps-text">
        <ReceiptIcon className="h-5 w-5" />
      </span>
      {/* tabIndex -1: recibe el foco al llegar, así un lector de pantalla lo anuncia primero. */}
      <h1 id={TITLE_ID} tabIndex={-1} className="mt-5 font-display text-heading text-balance text-scaps-text outline-none">
        Tu pedido está listo
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-scaps-text-secondary">
        Scaps es un proyecto demo: el pago en línea llega en la próxima etapa.
      </p>

      <section aria-labelledby="order-items-title" className="mt-8">
        <h2 id="order-items-title" className="text-xs font-medium tracking-wider text-scaps-text-muted uppercase">
          Resumen del pedido
        </h2>
        {/* Todo sale tal cual del carrito que mandó la API: acá no se calcula nada. */}
        <ul className="mt-3 divide-y divide-scaps-border-row border-y border-scaps-border-row">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="w-14 shrink-0">
                <ProductImage image={item.producto.imagen_principal} aspect="square" decorative />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-display text-base font-semibold wrap-break-word text-scaps-text">
                  {item.producto.nombre}
                </p>
                <p className="text-sm text-scaps-text-muted tabular-nums">Cantidad: {item.cantidad}</p>
              </div>
              <p className="shrink-0 text-sm font-medium text-scaps-text tabular-nums">
                <span className="sr-only">Subtotal: </span>
                {formatPrice(item.subtotal)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <dt className="text-base font-medium text-scaps-text">Total</dt>
            <dd className="text-2xl font-medium text-scaps-text tabular-nums">{formatPrice(cart.total)}</dd>
          </div>
        </dl>
      </section>

      {/* Es cierto: el carrito se guarda por usuario. Es justamente lo que el MVP sí hace. */}
      <p className="mt-6 text-sm text-scaps-text-secondary">Tu pedido queda guardado en tu cuenta.</p>

      {/* Una debajo de la otra en el celular, a todo el ancho; desde sm, lado a lado. */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/catalogo" className={`${primaryButtonClassName} sm:flex-1`}>
          Volver al catálogo
        </Link>
        <Link to="/carrito" className={`${secondaryButtonClassName} sm:flex-1`}>
          Volver al carrito
        </Link>
      </div>
    </>
  );
}

// Misma forma que la card cargada: nada salta cuando llega el carrito.
function OrderSkeleton() {
  return (
    <div aria-hidden="true" className={`${cardClassName} motion-safe:animate-pulse`}>
      <div className="h-11 w-11 rounded-full bg-scaps-placeholder" />
      <div className="mt-5 h-8 w-3/4 rounded-full bg-scaps-placeholder" />
      <div className="mt-4 h-3 rounded-full bg-scaps-placeholder" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-scaps-placeholder" />
      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-scaps bg-scaps-placeholder" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-2/3 rounded-full bg-scaps-placeholder" />
              <div className="h-3 w-1/3 rounded-full bg-scaps-placeholder" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 h-12 rounded-scaps bg-scaps-placeholder" />
    </div>
  );
}

/** /pedido: el cierre del recorrido. Protegida como el carrito, y solo con un carrito válido. */
export default function Pedido() {
  const cart = useCartStore((s) => s.cart);
  const status = useCartStore((s) => s.status);
  const loadError = useCartStore((s) => s.error);
  // El foco va al título una sola vez, al llegar: no cada vez que cambia el carrito.
  const focused = useRef(false);

  // Al recargar, el primer instante el store todavía está vacío: hay que esperar a que cargue
  // antes de decidir, o la recarga redirigiría siempre. 'idle': la sesión recién se confirmó.
  const loading = cart === null && (status === 'loading' || status === 'idle');
  const failed = cart === null && status === 'error';
  const ready = cart !== null && isCheckoutReady(cart);

  useEffect(() => {
    // Se llega desde el resumen del carrito, que en el celular está al final de la página.
    window.scrollTo(0, 0);
    document.title = 'Tu pedido | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  useEffect(() => {
    if (!ready || focused.current) return;
    focused.current = true;
    focusField(TITLE_ID, { preventScroll: true });
  }, [ready]);

  // Carrito vacío o con una línea que se pasa del stock (escribiendo la URL o volviendo con Atrás):
  // de vuelta al carrito, que dice qué ajustar. replace: Atrás no vuelve a rebotar acá.
  if (cart !== null && !ready) return <Navigate to="/carrito" replace />;

  return (
    <main className={pageClassName}>
      {/* Siempre montado: un lector de pantalla oye la carga. */}
      <p role="status" className="sr-only">
        {loading ? 'Cargando tu pedido…' : ''}
      </p>

      {failed ? (
        // Si la carga falla, el error con Reintentar, no la redirección: no se sabe cómo está el carrito.
        <section className={`${cardClassName} flex flex-col items-center gap-4 py-12 text-center`}>
          <h1 id={TITLE_ID} tabIndex={-1} className="font-display text-heading text-scaps-text outline-none">
            No pudimos cargar tu pedido
          </h1>
          <p role="alert" className="max-w-md text-sm text-scaps-text-secondary">
            {loadError?.message ?? 'Volvé a intentar en un momento.'}
          </p>
          <button
            type="button"
            onClick={() => {
              void useCartStore.getState().load();
              // El botón desaparece al reintentar: el foco no se pierde.
              focusField('contenido', { preventScroll: true });
            }}
            className={primaryButtonClassName}
          >
            Reintentar
          </button>
        </section>
      ) : cart ? (
        <div className={cardClassName}>
          <OrderSummary cart={cart} />
        </div>
      ) : (
        <OrderSkeleton />
      )}
    </main>
  );
}
