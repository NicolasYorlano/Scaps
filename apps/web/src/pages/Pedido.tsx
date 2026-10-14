import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import LineNotice from '../components/LineNotice';
import ProductImage from '../components/ProductImage';
import { SLOW_SERVER_MESSAGE } from '../components/SlowServerNotice';
import { FRESH_MS, useCartRefresh } from '../hooks/useCartRefresh';
import { sentence, toApiError } from '../lib/api';
import { isCheckoutReady } from '../lib/cart';
import { formatPrice } from '../lib/format-price';
import { focusField } from '../lib/forms';
import { useCartStatus, useCartStore } from '../stores/cart-store';
import { useRequestStore } from '../stores/request-store';
import type { Cart } from '../types/cart';

// Cierre del recorrido del MVP. No hay orden en la base (el checkout real llega después), así que
// esta pantalla no afirma que se compró nada: nada de "compra confirmada" ni un número de pedido.
// La compra se simula: descuenta el stock y vacía el carrito, y la pantalla dice que fue una simulación.

const TITLE_ID = 'order-title';

// md:short: es una pantalla ancha y baja (una notebook): todo va más apretado, para que entren las acciones.
const pageClassName = 'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 md:py-16 md:short:py-4';
// Card centrada de 520 px, como el resultado de pago de la guía; en el celular, a todo el ancho.
const cardClassName = 'mx-auto w-full max-w-130 rounded-scaps border border-scaps-border bg-scaps-card p-5 md:p-8';

// Las medidas que comparten la card y su esqueleto.
const headerClassName = 'md:short:flex md:short:items-center md:short:gap-3';
const sectionClassName = 'mt-8 md:short:mt-5';
const rowClassName = 'flex items-center gap-3 py-3 md:short:py-2.5';
const photoClassName = 'w-14 shrink-0 md:short:w-12';
const noteClassName = 'mt-6 md:short:mt-4';
// Una debajo de la otra en el celular, a todo el ancho; desde sm, lado a lado.
const actionsClassName = 'mt-8 flex flex-col gap-3 sm:flex-row md:short:mt-5';

const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
const secondaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-input px-6 text-sm font-medium text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:text-scaps-text';
// -my-3 py-3: 44 px de área táctil sin mover el texto, como Seguir comprando en el carrito.
const textLinkClassName =
  '-my-3 py-3 font-medium text-scaps-text-secondary underline underline-offset-4 hover:text-scaps-text';
const textButtonClassName =
  '-my-3 cursor-pointer py-3 font-medium whitespace-nowrap text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary';

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

function OrderHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className={headerClassName}>
        {/* 44 px, como el ícono del resultado de pago de la guía. */}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-scaps-border-input text-scaps-text">
          <ReceiptIcon className="h-5 w-5" />
        </span>
        {/* tabIndex -1: recibe el foco al llegar, así un lector de pantalla lo anuncia primero. */}
        <h1 id={TITLE_ID} tabIndex={-1} className="mt-5 font-display text-heading text-balance text-scaps-text outline-none md:short:mt-0">
          {title}
        </h1>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-scaps-text-secondary">{children}</p>
    </>
  );
}

function OrderItems({ cart, title }: { cart: Cart; title: string }) {
  return (
    <section aria-labelledby="order-items-title" className={sectionClassName}>
      <h2 id="order-items-title" className="text-xs font-medium tracking-wider text-scaps-text-muted uppercase">
        {title}
      </h2>
      {/* Todo sale tal cual del carrito que mandó la API: acá no se calcula nada. */}
      <ul className="mt-3 divide-y divide-scaps-border-row border-y border-scaps-border-row">
        {cart.items.map((item) => (
          <li key={item.id} className={rowClassName}>
            <div className={photoClassName}>
              <ProductImage image={item.producto.imagen_principal} aspect="square" decorative />
            </div>
            {/* En el celular el nombre usa todo el ancho y el subtotal baja al renglón de la cantidad; */}
            {/* desde sm va a la derecha, centrado con la foto. */}
            <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-3">
              <p className="line-clamp-3 font-display text-base font-semibold wrap-break-word text-scaps-text sm:col-start-1 sm:row-start-1 sm:line-clamp-2">
                {item.producto.nombre}
              </p>
              {/* flex-wrap: con la letra agrandada el subtotal pasa abajo. contents: desde sm, cada uno a su celda. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:contents">
                <p className="text-sm text-scaps-text-muted tabular-nums sm:col-start-1 sm:row-start-2">
                  Cantidad: {item.cantidad}
                </p>
                <p className="text-sm font-medium text-scaps-text tabular-nums sm:col-start-2 sm:row-span-2 sm:row-start-1">
                  <span className="sr-only">Subtotal: </span>
                  {formatPrice(item.subtotal)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <dt className="text-base font-medium text-scaps-text">Total</dt>
          <dd className="min-w-0 text-2xl font-medium wrap-break-word text-scaps-text tabular-nums">{formatPrice(cart.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

/** El aviso de servidor lento, dentro de la pantalla: el flotante taparía las acciones. */
function SlowNotice({ className }: { className: string }) {
  const isSlow = useRequestStore((s) => s.isSlow);
  if (!isSlow) return null;

  return (
    <p role="status" className={`text-sm text-scaps-text-secondary ${className}`}>
      {SLOW_SERVER_MESSAGE}
    </p>
  );
}

// Misma forma que la card cargada: nada salta cuando llega el carrito.
// Cada barra va en una caja con la letra de lo que reemplaza + h-lh, así mide su renglón.
function OrderSkeleton() {
  const bar = 'rounded-full bg-scaps-placeholder';

  return (
    <div aria-hidden="true" className={`${cardClassName} motion-safe:animate-pulse`}>
      <div className={headerClassName}>
        <div className="h-11 w-11 shrink-0 rounded-full bg-scaps-placeholder" />
        {/* Debajo de 371 px el título ocupa dos renglones. */}
        <div className="mt-5 flex h-lh items-center font-display text-heading max-[370px]:h-[2lh] md:short:mt-0 md:short:flex-1">
          <div className={`h-6 w-3/4 ${bar}`} />
        </div>
      </div>
      {/* La línea del demo: dos renglones en el celular, uno desde sm. */}
      <div className="mt-3 flex h-[2lh] flex-col justify-around text-sm leading-relaxed sm:h-lh">
        <div className={`h-3 ${bar}`} />
        <div className={`h-3 w-2/3 sm:hidden ${bar}`} />
      </div>

      <div className={sectionClassName}>
        <div className="flex h-lh items-center text-xs">
          <div className={`h-2.5 w-32 ${bar}`} />
        </div>
        <div className="mt-3 divide-y divide-scaps-border-row border-y border-scaps-border-row">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={rowClassName}>
              <div className={`${photoClassName} aspect-square rounded-scaps bg-scaps-placeholder`} />
              <div className="flex flex-1 flex-col">
                <div className="flex h-lh items-center text-base">
                  <div className={`h-3.5 w-2/3 ${bar}`} />
                </div>
                <div className="flex h-lh items-center text-sm">
                  <div className={`h-3 w-1/3 ${bar}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-lh items-center text-2xl">
          <div className={`h-5 w-full ${bar}`} />
        </div>
      </div>

      <div className={`${noteClassName} flex h-lh items-center text-sm`}>
        <div className={`h-3 w-3/5 ${bar}`} />
      </div>
      <div className={actionsClassName}>
        <div className="h-12 rounded-scaps bg-scaps-placeholder sm:flex-1" />
        <div className="h-12 rounded-scaps bg-scaps-placeholder sm:flex-1" />
      </div>
      <div className="mt-4 flex h-lh items-center justify-center text-sm">
        <div className={`h-3 w-32 ${bar}`} />
      </div>
    </div>
  );
}

/** /pedido: el cierre del recorrido. Protegida como el carrito, y solo con un carrito válido. */
export default function Pedido() {
  const cart = useCartStore((s) => s.cart);
  const status = useCartStatus();
  const loadError = useCartStore((s) => s.error);
  const syncedAt = useCartStore((s) => s.syncedAt);
  // Entrando con una copia vieja (Atrás, Adelante) no se afirma nada: se espera la que pide useCartRefresh.
  const [freshFrom] = useState(() => Date.now() - FRESH_MS);
  const [retrying, setRetrying] = useState(false);
  // La compra simulada: el carrito que está viajando, lo que devolvió el servidor y, si falló, el motivo.
  const [sending, setSending] = useState<Cart | null>(null);
  const [purchase, setPurchase] = useState<Cart | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  // El foco va al título una sola vez, al llegar: no cada vez que cambia el carrito.
  const focused = useRef(false);
  useCartRefresh();

  const confirmed = syncedAt >= freshFrom;
  const stale = cart !== null && !confirmed;
  // Al recargar, el primer instante el store todavía está vacío: hay que esperar a que cargue
  // antes de decidir, o la recarga redirigiría siempre.
  const failed = status === 'error' || (stale && loadError !== null && !retrying);
  const loading = !failed && (status === 'loading' || stale);
  const ready = cart !== null && confirmed && isCheckoutReady(cart);
  // Con la compra hecha o viajando el carrito ya puede estar vacío: manda lo que se compró.
  const busy = sending !== null;
  const done = purchase !== null;
  const order = sending ?? (ready ? cart : null);

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
    // Solo si el foco quedó suelto, o en el contenedor que lo recibe al reintentar:
    // a quien ya está en otra cosa (el menú, un enlace) no se lo saca.
    const active = document.activeElement;
    if (active === null || active === document.body || active.id === 'contenido') {
      focusField(TITLE_ID, { preventScroll: true });
    }
  }, [ready]);

  useEffect(() => {
    if (!done) return;
    // El botón que se tocó ya no está: el título nuevo, arriba de todo, recibe el foco.
    window.scrollTo(0, 0);
    document.title = 'Compra simulada | Scaps';
    focusField(TITLE_ID, { preventScroll: true });
  }, [done]);

  function retry() {
    setRetrying(true);
    void useCartStore.getState().load().finally(() => setRetrying(false));
    // El botón desaparece al reintentar: el foco no se pierde.
    focusField('contenido', { preventScroll: true });
  }

  async function simulate() {
    if (busy || cart === null) return;
    setSending(cart);
    setPurchaseError(null);
    try {
      setPurchase(await useCartStore.getState().purchase());
    } catch (e) {
      const error = toApiError(e);
      // 401: el store ya cerró la sesión; RequireAuth manda al login y, al ingresar, vuelve acá.
      if (error.status === 401) return;
      // 409 o 400: el carrito cambió por otro lado. Con el carrito al día decide la pantalla:
      // si ya no sirve, vuelve al carrito, que dice qué ajustar.
      if (error.status === 409 || error.status === 400) await useCartStore.getState().load();
      setPurchaseError(error.message);
    } finally {
      setSending(null);
    }
  }

  // Carrito vacío o con una línea que se pasa del stock (escribiendo la URL o volviendo con Atrás):
  // de vuelta al carrito, que dice qué ajustar. replace: Atrás no vuelve a rebotar acá.
  if (!done && !busy && cart !== null && confirmed && !ready) return <Navigate to="/carrito" replace />;

  return (
    <main data-stable-scrollbar className={pageClassName}>
      {/* Siempre montado: un lector de pantalla oye la carga. */}
      <p role="status" className="sr-only">
        {loading ? 'Cargando tu pedido…' : ''}
      </p>

      {purchase ? (
        <div className={cardClassName}>
          <OrderHeader title="Compra simulada">
            Scaps es un proyecto demo: no se cobró nada y no vas a recibir ningún producto.
          </OrderHeader>
          <OrderItems cart={purchase} title="Resumen de la compra" />
          <Link to="/catalogo" className={`${primaryButtonClassName} mt-8 md:short:mt-5`}>
            Volver al catálogo
          </Link>
        </div>
      ) : failed ? (
        // Si la carga falla, el error con Reintentar, no la redirección: no se sabe cómo está el carrito.
        <section className={`${cardClassName} flex flex-col items-center gap-4 py-12 text-center md:py-12`}>
          <h1 id={TITLE_ID} tabIndex={-1} className="font-display text-heading text-scaps-text outline-none">
            No pudimos cargar tu pedido
          </h1>
          <p role="alert" className="max-w-md text-sm text-scaps-text-secondary">
            {loadError?.message ?? 'Volvé a intentar en un momento.'}
          </p>
          <button type="button" onClick={retry} className={primaryButtonClassName}>
            Reintentar
          </button>
        </section>
      ) : order ? (
        <div className={cardClassName}>
          <OrderHeader title="Tu pedido está listo">
            Scaps es un proyecto demo: el pago en línea llega en la próxima etapa.
          </OrderHeader>

          {/* Volver a pedirlo falló con el pedido ya a la vista: queda como estaba, con el aviso. */}
          {loadError && !busy && (
            <div
              role="alert"
              className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-scaps border border-scaps-border-input bg-scaps-card-highlight px-3.5 py-3 text-sm text-scaps-text"
            >
              <span>No pudimos actualizar tu pedido. {loadError.message}</span>
              <button type="button" onClick={() => void useCartStore.getState().load()} className={textButtonClassName}>
                Reintentar
              </button>
            </div>
          )}

          <OrderItems cart={order} title="Resumen del pedido" />

          {/* Es cierto: el carrito se guarda por usuario. Es justamente lo que el MVP sí hace. */}
          <p className={`${noteClassName} text-sm text-scaps-text-secondary`}>Tu pedido queda guardado en tu cuenta.</p>

          {purchaseError && (
            <div className="mt-4">
              <LineNotice alert>No pudimos simular la compra. {sentence(purchaseError)}</LineNotice>
            </div>
          )}
          <SlowNotice className="mt-4" />

          <div className={actionsClassName}>
            {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras viaja. */}
            <button
              type="button"
              aria-disabled={busy}
              aria-busy={busy}
              onClick={() => void simulate()}
              className={`${primaryButtonClassName} gap-2 sm:flex-1 ${busy ? 'cursor-progress' : ''}`}
            >
              {busy && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
                />
              )}
              {busy ? 'Simulando la compra…' : 'Simular compra'}
            </button>
            {/* Con la compra viajando las otras dos salidas esperan: irse a mitad dejaría el final sin ver. */}
            <Link
              to="/carrito"
              aria-disabled={busy || undefined}
              tabIndex={busy ? -1 : undefined}
              className={`${secondaryButtonClassName} sm:flex-1 ${busy ? 'pointer-events-none opacity-50' : ''}`}
            >
              Volver al carrito
            </Link>
          </div>
          <p className="mt-4 flex justify-center text-sm">
            <Link
              to="/catalogo"
              aria-disabled={busy || undefined}
              tabIndex={busy ? -1 : undefined}
              className={`${textLinkClassName} ${busy ? 'pointer-events-none opacity-50' : ''}`}
            >
              Volver al catálogo
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* El esqueleto no se anuncia: mientras tanto, la pantalla igual tiene título. */}
          <h1 className="sr-only">Tu pedido</h1>
          <OrderSkeleton />
          <SlowNotice className="mx-auto mt-4 w-full max-w-130 text-center" />
        </>
      )}
    </main>
  );
}
