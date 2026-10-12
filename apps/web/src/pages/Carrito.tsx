import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import CartIcon from '../components/CartIcon';
import FormAlert from '../components/FormAlert';
import ProductImage from '../components/ProductImage';
import QuantitySelector from '../components/QuantitySelector';
import SoldOutBadge from '../components/SoldOutBadge';
import { toApiError } from '../hooks/useApi';
import { exceedsStock } from '../lib/cart';
import { formatPrice } from '../lib/format-price';
import { focusField } from '../lib/forms';
import { useCartStore, useCartUnitCount } from '../stores/cart-store';
import type { CartItem } from '../types/cart';

const TITLE_ID = 'cart-title';
const EMPTY_TITLE_ID = 'cart-empty-title';

const pageClassName = 'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';
// Centrada, con el mismo ancho que la ficha.
const contentClassName = 'mx-auto flex w-full max-w-311 flex-col';

// Desde lg el resumen va al costado (360 px, separado 32), como en la guía; antes, debajo de los ítems.
const layoutClassName =
  'mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]';

const cardClassName = 'rounded-scaps border border-scaps-border bg-scaps-card';

// Cada línea se acomoda al ancho de la lista (container queries), no al de la pantalla:
// desde lg la lista comparte la fila con el resumen y queda más angosta que en una tablet.
//   angosta (celular): la imagen y el nombre arriba; la cantidad, el subtotal y Quitar abajo, a todo el ancho
//   @md (448 px): la imagen al costado de todo
//   @3xl (768 px): una sola fila, con las columnas del encabezado
const lineClassName =
  'grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 px-4 py-4 @md:grid-cols-[5.5rem_minmax(0,1fr)] @md:px-6 @md:py-5 @3xl:grid-cols-[5.5rem_minmax(0,1fr)_auto] @3xl:gap-x-6';
const imageCellClassName = 'col-start-1 row-start-1 @md:row-span-2 @3xl:row-span-1';
// En una fila, el nombre y el precio quedan centrados con la foto.
const infoCellClassName = 'col-start-2 row-start-1 flex min-w-0 flex-col gap-1 @3xl:self-center';
// En una fila, el selector (44 px) queda centrado con la foto (88). Un margen fijo y no
// self-center: cuando aparece el aviso de tope debajo del selector, la fila no se mueve.
const controlsCellClassName =
  'col-span-2 row-start-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 @md:col-span-1 @md:col-start-2 @3xl:col-start-3 @3xl:row-start-1 @3xl:mt-5.5 @3xl:grid-cols-[9rem_7rem_5rem] @3xl:gap-x-6';
// Las columnas del encabezado coinciden con las de una línea en una fila.
const headerClassName =
  'hidden grid-cols-[minmax(0,1fr)_9rem_7rem_5rem] gap-x-6 rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight px-6 py-3 text-xs font-medium tracking-wider text-scaps-text-muted uppercase @3xl:grid';

const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
const secondaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-input px-6 text-sm font-medium text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:text-scaps-text';
// -my-3 py-3: 44 px de área táctil sin mover el texto, como los enlaces de la ficha.
const textButtonClassName =
  '-my-3 py-3 font-medium whitespace-nowrap text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary';

/** El pedido en curso de una línea. */
type Pending = { type: 'update'; quantity: number } | { type: 'remove' };

/** El aviso del último pedido que falló, en la línea que lo pidió. */
type Failure = { itemId: string; message: string };

function unitsLabel(units: number) {
  return units === 1 ? '1 unidad' : `${units} unidades`;
}

function lineNameId(itemId: string) {
  return `cart-line-${itemId}`;
}

/** Aviso dentro de una línea: el sistema es monocromo, así que lo marca el ícono y no un color. */
function LineNotice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <p role={alert ? 'alert' : undefined} className="flex gap-2 text-sm text-scaps-text">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.25]"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.75v4M8 11.25v.01" strokeLinecap="round" />
      </svg>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

type LineProps = {
  item: CartItem;
  pending: Pending | undefined;
  failure: string | null;
  onQuantityChange: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
};

function CartLine({ item, pending, failure, onQuantityChange, onRemove }: LineProps) {
  const { producto } = item;
  const soldOut = producto.stock <= 0;
  const overStock = !soldOut && exceedsStock(item);
  const busy = pending !== undefined;
  const removing = pending?.type === 'remove';
  // Mientras viaja el cambio, el selector ya muestra lo pedido; el subtotal espera al backend.
  const quantity = pending?.type === 'update' ? pending.quantity : item.cantidad;
  const productPath = `/producto/${producto.slug}`;

  return (
    <li
      aria-busy={busy}
      className={`${lineClassName} transition-opacity duration-200 motion-reduce:transition-none ${removing ? 'opacity-50' : ''}`}
    >
      {/* Fuera del Tab y de los lectores de pantalla: el nombre ya es el enlace a la ficha. */}
      <Link
        to={productPath}
        tabIndex={-1}
        aria-hidden="true"
        className={`${imageCellClassName} block ${soldOut ? '[&_img]:opacity-70' : ''}`}
      >
        <ProductImage image={producto.imagen_principal} aspect="square" decorative />
      </Link>

      <div className={infoCellClassName}>
        <h3 className="line-clamp-2 font-display text-card wrap-break-word text-scaps-text">
          <Link
            id={lineNameId(item.id)}
            to={productPath}
            className="decoration-1 underline-offset-4 hover:underline"
          >
            {producto.nombre}
          </Link>
        </h3>
        <p className="text-sm text-scaps-text-muted tabular-nums">
          <span className="sr-only">Precio unitario: </span>
          {formatPrice(producto.precio)}
          <span aria-hidden="true"> c/u</span>
        </p>
        {/* El stock nunca se muestra: el aviso es cualitativo. */}
        {soldOut && (
          <div className="mt-1">
            <LineNotice>Este producto se quedó sin stock: quitalo para continuar.</LineNotice>
          </div>
        )}
        {overStock && (
          <div className="mt-1">
            <LineNotice>No hay unidades suficientes de este producto, ajustá la cantidad.</LineNotice>
          </div>
        )}
      </div>

      <div className={controlsCellClassName}>
        <div className="col-start-1 row-span-2 row-start-1 @3xl:row-span-1">
          {soldOut ? (
            // Sin selector: solo se puede quitar.
            <div className="flex h-11 items-center gap-2 whitespace-nowrap">
              <SoldOutBadge />
              <span className="text-sm text-scaps-text-muted tabular-nums">{unitsLabel(item.cantidad)}</span>
            </div>
          ) : (
            // Por encima del tope (el admin bajó el stock), el componente deshabilita el +
            // y el − baja directo al máximo.
            <QuantitySelector
              value={quantity}
              max={producto.stock}
              onChange={(next) => onQuantityChange(item, next)}
              disabled={busy}
              label={`Cantidad de ${producto.nombre}`}
            />
          )}
        </div>

        <p
          className={`col-start-2 row-start-1 flex h-11 items-center justify-end text-base font-medium text-scaps-text tabular-nums transition-opacity duration-200 motion-reduce:transition-none ${pending?.type === 'update' ? 'opacity-50' : ''}`}
        >
          <span className="sr-only">Subtotal: </span>
          {formatPrice(item.subtotal)}
        </p>

        {/* Pegado al subtotal cuando van apilados; en una fila, su propia columna. */}
        <div className="col-start-2 row-start-2 -mt-2 justify-self-end @3xl:col-start-3 @3xl:row-start-1 @3xl:mt-0 @3xl:flex @3xl:h-11 @3xl:items-center">
          {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras quita. */}
          <button
            type="button"
            aria-disabled={busy}
            onClick={() => {
              if (!busy) onRemove(item);
            }}
            className={`${textButtonClassName} text-sm text-scaps-text-secondary hover:text-scaps-text aria-disabled:cursor-not-allowed aria-disabled:text-scaps-text-annotation aria-disabled:no-underline ${removing ? 'cursor-progress!' : ''}`}
          >
            {removing ? 'Quitando…' : 'Quitar'}
            <span className="sr-only"> {producto.nombre} del carrito</span>
          </button>
        </div>
      </div>

      {failure && (
        <div className="col-span-full">
          <LineNotice alert>{failure}</LineNotice>
        </div>
      )}
    </li>
  );
}

function Summary({ units, total, updating }: { units: number; total: string; updating: boolean }) {
  return (
    // sticky: en un carrito largo, el total sigue a la vista mientras se recorren las líneas.
    <aside
      aria-labelledby="cart-summary-title"
      className="flex flex-col rounded-scaps border border-scaps-border bg-scaps-card-highlight p-5 md:p-6 lg:sticky lg:top-8"
    >
      <h2 id="cart-summary-title" className="font-display text-2xl font-medium text-scaps-text">
        Resumen
      </h2>
      {/* Los dos números salen del carrito que mandó la API: acá no se suma nada. */}
      <dl
        aria-busy={updating}
        className={`mt-3 transition-opacity duration-200 motion-reduce:transition-none ${updating ? 'opacity-50' : ''}`}
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-scaps-border py-3 text-sm">
          <dt className="text-scaps-text-secondary">Unidades</dt>
          <dd className="font-medium text-scaps-text tabular-nums">{units}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 pt-4">
          <dt className="text-base font-medium text-scaps-text">Total</dt>
          <dd className="text-2xl font-medium text-scaps-text tabular-nums">{formatPrice(total)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-scaps-text-muted">Tu carrito queda guardado en tu cuenta.</p>

      {/* Finalizar compra va acá, arriba de Seguir comprando: lo suma la tarea del cierre del pedido. */}
      <Link to="/catalogo" className={`mt-6 ${secondaryButtonClassName}`}>
        Seguir comprando
      </Link>
    </aside>
  );
}

// Misma forma que el carrito cargado: nada salta cuando llega.
function CartSkeleton() {
  return (
    <div aria-hidden="true" className={`${layoutClassName} motion-safe:animate-pulse`}>
      <div className={`@container ${cardClassName}`}>
        <div className="hidden h-10 rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight @3xl:block" />
        <ul className="divide-y divide-scaps-border-row">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i} className={lineClassName}>
              <div className={`${imageCellClassName} aspect-square rounded-scaps bg-scaps-placeholder`} />
              <div className={`${infoCellClassName} gap-2.5 py-1`}>
                <div className="h-4 w-3/4 rounded-full bg-scaps-placeholder" />
                <div className="h-3 w-1/3 rounded-full bg-scaps-placeholder" />
              </div>
              <div className={controlsCellClassName}>
                <div className="col-start-1 row-start-1 h-11 w-36 rounded-scaps bg-scaps-placeholder" />
                <div className="col-start-2 row-start-1 flex h-11 items-center justify-end">
                  <div className="h-3.5 w-20 rounded-full bg-scaps-placeholder" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Sobre el fondo del resumen, el gris de los placeholders casi no se ve: va uno más claro. */}
      <div className="flex flex-col gap-4 rounded-scaps border border-scaps-border bg-scaps-card-highlight p-5 md:p-6">
        <div className="h-6 w-28 rounded-full bg-scaps-border" />
        <div className="h-3.5 rounded-full bg-scaps-border" />
        <div className="h-7 rounded-full bg-scaps-border" />
        <div className="mt-4 h-12 rounded-scaps bg-scaps-border" />
      </div>
    </div>
  );
}

/** Pantalla del carrito. La ruta está protegida: sin sesión manda al login y, al ingresar, vuelve. */
export default function Carrito() {
  const cart = useCartStore((s) => s.cart);
  const status = useCartStore((s) => s.status);
  const loadError = useCartStore((s) => s.error);
  const units = useCartUnitCount();

  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  // Lo que oye un lector de pantalla después de cada cambio.
  const [announcement, setAnnouncement] = useState('');
  // La línea que se está quitando y en qué lugar estaba: al irse, el foco pasa a la que queda en ese lugar.
  const removal = useRef<{ itemId: string; index: number } | null>(null);

  useEffect(() => {
    // La SPA no vuelve sola arriba al cambiar de ruta (se llega, por ejemplo, desde el Ver carrito de la ficha).
    window.scrollTo(0, 0);
    document.title = 'Carrito | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  useEffect(() => {
    const target = removal.current;
    if (!target || !cart || cart.items.some((item) => item.id === target.itemId)) return;
    removal.current = null;
    // Solo si el foco se perdió con el botón que desapareció: si la persona ya siguió con otra cosa, no se lo saca.
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const next = cart.items[Math.min(target.index, cart.items.length - 1)];
    focusField(next ? lineNameId(next.id) : EMPTY_TITLE_ID);
  }, [cart]);

  const items = cart?.items ?? [];
  // 'idle': la sesión recién se confirmó y el store todavía no arrancó el pedido.
  const loading = cart === null && (status === 'loading' || status === 'idle');
  const failed = cart === null && status === 'error';
  const updating = Object.keys(pending).length > 0;
  // El aviso de una línea que ya no está (por ejemplo, se quitó desde otra pestaña) va arriba de todo.
  const orphanFailure = failure && !items.some((item) => item.id === failure.itemId) ? failure : null;

  async function change(item: CartItem, next: Pending) {
    if (pending[item.id]) return;
    const { updateItem, removeItem } = useCartStore.getState();

    setFailure(null);
    setPending((current) => ({ ...current, [item.id]: next }));
    if (next.type === 'remove') {
      removal.current = { itemId: item.id, index: items.findIndex((line) => line.id === item.id) };
    }

    try {
      if (next.type === 'update') await updateItem(item.id, next.quantity);
      else await removeItem(item.id);

      const total = useCartStore.getState().cart?.total;
      const done =
        next.type === 'remove'
          ? `Quitaste ${item.producto.nombre} del carrito.`
          : `Cantidad de ${item.producto.nombre}: ${next.quantity}.`;
      setAnnouncement(total ? `${done} Total: ${formatPrice(total)}.` : done);
    } catch (e) {
      const apiError = toApiError(e);
      // Con un 404 la línea igual se va al recargar: el foco pasa a la siguiente, como al quitarla.
      if (removal.current?.itemId === item.id && apiError.status !== 404) removal.current = null;
      // 401: el store ya cerró la sesión; RequireAuth manda al login y, al ingresar, vuelve acá.
      if (apiError.status === 401) return;
      setFailure({ itemId: item.id, message: apiError.message });
      // 409 o 404: el carrito cambió por otro lado (el admin bajó el stock, se quitó desde otra
      // pestaña). El aviso es el del backend, y el carrito se vuelve a pedir para quedar al día.
      if (apiError.status === 409 || apiError.status === 404) void useCartStore.getState().load();
    } finally {
      setPending((current) => {
        const rest = { ...current };
        delete rest[item.id];
        return rest;
      });
    }
  }

  function retry() {
    void useCartStore.getState().load();
    // El botón desaparece al reintentar: el foco va al título en vez de perderse.
    focusField(TITLE_ID);
  }

  return (
    <main className={pageClassName}>
      <div className={contentClassName}>
        {/* mb en em: la "g" de otros títulos baja de la caja; mismo aire que el catálogo. */}
        <h1 id={TITLE_ID} tabIndex={-1} className="mb-[0.25em] font-display text-title text-scaps-text outline-none">
          Carrito
        </h1>
        {/* min-h-5: reserva el renglón para que nada salte al cargar. */}
        <p className="min-h-5 text-sm text-scaps-text-muted">{items.length > 0 && unitsLabel(units)}</p>

        {/* Siempre montado: un lector de pantalla oye la carga y cada cambio. */}
        <p role="status" className="sr-only">
          {loading ? 'Cargando tu carrito…' : announcement}
        </p>

        {orphanFailure && (
          <div className="mt-6">
            <FormAlert messages={[orphanFailure.message]} />
          </div>
        )}

        {/* Volver a pedirlo (después de un 409) falló: el carrito anterior queda a la vista. */}
        {cart && loadError && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-scaps border border-scaps-border-input bg-scaps-card-highlight px-3.5 py-3 text-sm text-scaps-text"
          >
            <span>No pudimos actualizar tu carrito. {loadError.message}</span>
            <button type="button" onClick={() => void useCartStore.getState().load()} className={textButtonClassName}>
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <CartSkeleton />
        ) : failed ? (
          <section className={`mt-6 flex flex-col items-center gap-4 px-6 py-16 text-center ${cardClassName}`}>
            <h2 className="font-display text-heading text-scaps-text">No pudimos cargar tu carrito</h2>
            <p role="alert" className="max-w-md text-sm text-scaps-text-secondary">
              {loadError?.message ?? 'Volvé a intentar en un momento.'}
            </p>
            <button type="button" onClick={retry} className={primaryButtonClassName}>
              Reintentar
            </button>
          </section>
        ) : items.length === 0 ? (
          <section
            aria-labelledby={EMPTY_TITLE_ID}
            className={`mt-6 flex flex-col items-center gap-4 px-6 py-16 text-center ${cardClassName}`}
          >
            <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-scaps-border bg-scaps-canvas text-scaps-text-muted">
              <CartIcon className="h-7 w-7" />
            </span>
            {/* tabIndex -1: recibe el foco al quitar la última línea. */}
            <h2 id={EMPTY_TITLE_ID} tabIndex={-1} className="font-display text-heading text-scaps-text outline-none">
              Tu carrito está vacío
            </h2>
            <p className="max-w-sm text-sm text-scaps-text-secondary">
              Elegí tus gorras en el catálogo. Podés mirarlas en 3D antes de sumarlas.
            </p>
            <Link to="/catalogo" className={`mt-2 ${primaryButtonClassName}`}>
              Ver catálogo
            </Link>
          </section>
        ) : (
          <div className={layoutClassName}>
            <section aria-labelledby="cart-items-title" className={`@container ${cardClassName}`}>
              <h2 id="cart-items-title" className="sr-only">
                Productos en tu carrito
              </h2>
              {/* Solo a la vista: cada línea ya nombra lo suyo para un lector de pantalla. */}
              <div aria-hidden="true" className={headerClassName}>
                <span>Producto</span>
                <span>Cantidad</span>
                <span className="text-right">Subtotal</span>
              </div>
              {/* Vienen ordenadas por nombre desde la API: cambiar una cantidad no mueve la línea. */}
              <ul className="divide-y divide-scaps-border-row">
                {items.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    pending={pending[item.id]}
                    failure={failure?.itemId === item.id ? failure.message : null}
                    onQuantityChange={(line, quantity) => void change(line, { type: 'update', quantity })}
                    onRemove={(line) => void change(line, { type: 'remove' })}
                  />
                ))}
              </ul>
            </section>

            {cart && <Summary units={units} total={cart.total} updating={updating} />}
          </div>
        )}
      </div>
    </main>
  );
}
