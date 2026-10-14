import { useEffect, useRef, useState } from 'react';
import {Link, NavigationType, useNavigate, useNavigationType} from 'react-router';
import CartIcon from '../components/CartIcon';
import FormAlert from '../components/FormAlert';
import LineNotice from '../components/LineNotice';
import ProductImage from '../components/ProductImage';
import QuantitySelector from '../components/QuantitySelector';
import RelatedProducts from '../components/RelatedProducts';
import SoldOutBadge from '../components/SoldOutBadge';
import { useCartRefresh } from '../hooks/useCartRefresh';
import { sentence, toApiError } from '../lib/api';
import { exceedsStock, isCheckoutReady, isSoldOut } from '../lib/cart';
import { formatPrice } from '../lib/format-price';
import { focusField } from '../lib/forms';
import { useCartStatus, useCartStore, useCartUnitCount } from '../stores/cart-store';
import type { CartItem } from '../types/cart';

const TITLE_ID = 'cart-title';
const EMPTY_TITLE_ID = 'cart-empty-title';
const CHECKOUT_REASON_ID = 'cart-checkout-reason';

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
// Apilada, el subtotal y Quitar van a la derecha del selector; si no entran al lado (letra agrandada), pasan abajo.
const controlsCellClassName =
  'col-span-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 @md:col-span-1 @md:col-start-2 @3xl:col-start-3 @3xl:row-start-1 @3xl:mt-5.5 @3xl:grid @3xl:grid-cols-[9rem_7rem_5rem] @3xl:gap-x-6';
// Apilados, el subtotal (24 px) y Quitar (20) miden juntos lo que el selector: el bloque queda alineado con él.
// contents: en una fila, cada uno ocupa su columna.
const amountCellClassName = 'ml-auto flex flex-col items-end @3xl:contents';
// Las columnas del encabezado coinciden con las de una línea en una fila.
const headerClassName =
  'hidden grid-cols-[minmax(0,1fr)_9rem_7rem_5rem] gap-x-6 rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight px-6 py-3 text-xs font-medium tracking-wider text-scaps-text-muted uppercase @3xl:grid';

const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
// El resumen ya tiene el fondo del hover de primaryButtonClassName: acá el hover aclara el borde y el fondo.
const checkoutButtonClassName =
  'flex h-12 w-full items-center justify-center gap-2 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:border-scaps-text hover:bg-scaps-text/10 aria-disabled:cursor-not-allowed aria-disabled:border-scaps-border aria-disabled:text-scaps-text-annotation aria-disabled:hover:border-scaps-border aria-disabled:hover:bg-transparent';
// -my-3 py-3: 44 px de área táctil sin mover el texto, como los enlaces de la ficha.
const textButtonClassName =
  '-my-3 cursor-pointer py-3 font-medium whitespace-nowrap text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary';
// El área táctil la da el ::after y crece a los costados y hacia abajo, hasta el borde de la línea: hacia arriba pisaría el subtotal.
const removeButtonClassName =
  'relative cursor-pointer text-sm font-medium whitespace-nowrap text-scaps-text-secondary underline underline-offset-4 hover:text-scaps-text after:absolute after:-inset-x-2 after:top-0 after:-bottom-4 @3xl:after:-inset-y-3 aria-disabled:cursor-not-allowed aria-disabled:text-scaps-text-annotation aria-disabled:no-underline';

/** El aviso del último pedido que falló, en la línea que lo pidió. */
type Failure = { itemId: string; message: string };

function lineNameId(itemId: string) {
  return `cart-line-${itemId}`;
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

/**
 * Cambios de cantidad y quitar. El selector muestra enseguida lo elegido (`drafts`): el primer toque sale
 * al momento y los que llegan mientras viaja se juntan en un solo PATCH con el último valor.
 */
function useLineChanges() {
  // La cantidad elegida y todavía sin confirmar, por línea.
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [removing, setRemoving] = useState<Record<string, true>>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  // Lo que oye un lector de pantalla después de cada cambio.
  const [announcement, setAnnouncement] = useState('');
  // Lo último pedido por línea y lo que está viajando: los leen respuestas que llegan más tarde.
  const wanted = useRef(new Map<string, number>());
  const inFlight = useRef(new Map<string, Promise<boolean>>());
  // La línea que se está quitando y en qué lugar estaba: al irse, el foco pasa a la que queda en ese lugar.
  // También la que desaparece por un 404 en un cambio de cantidad.
  const leaving = useRef<{ itemId: string; index: number } | null>(null);
  const cart = useCartStore((s) => s.cart);

  useEffect(() => {
    const target = leaving.current;
    if (!target || !cart || cart.items.some((item) => item.id === target.itemId)) return;
    leaving.current = null;
    // Solo si el foco se perdió con el botón que desapareció: si la persona ya siguió con otra cosa, no se lo saca.
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const next = cart.items[Math.min(target.index, cart.items.length - 1)];
    focusField(next ? lineNameId(next.id) : EMPTY_TITLE_ID);
  }, [cart]);

  function announce(done: string) {
    const total = useCartStore.getState().cart?.total;
    setAnnouncement(total ? `${done} Total: ${formatPrice(total)}.` : done);
  }

  async function fail(item: CartItem, index: number, error: unknown) {
    const apiError = toApiError(error);
    // 401: el store ya cerró la sesión; RequireAuth manda al login y, al ingresar, vuelve acá.
    if (apiError.status === 401) return;

    // 409 o 404: el carrito cambió por otro lado (el admin bajó el stock, se quitó desde otra
    // pestaña). El aviso es el del backend, y el carrito se vuelve a pedir para quedar al día.
    if (apiError.status === 409 || apiError.status === 404) {
      // Con un 404 la línea igual se va al recargar: el foco pasa a la siguiente, como al quitarla.
      if (apiError.status === 404) leaving.current = { itemId: item.id, index };
      await useCartStore.getState().load();
      const line = useCartStore.getState().cart?.items.find((it) => it.id === item.id);
      // Ya al día, la línea se pasa del stock y lo dice: mostrar también el del backend lo repite.
      if (line && exceedsStock(line)) {
        setAnnouncement(sentence(apiError.message));
        return;
      }
    }
    setFailure({ itemId: item.id, message: apiError.message });
  }

  async function send(item: CartItem, index: number): Promise<boolean> {
    for (;;) {
      const quantity = wanted.current.get(item.id);
      // La línea se quitó mientras tanto: no queda nada que mandar.
      if (quantity === undefined) return true;

      try {
        await useCartStore.getState().updateItem(item.id, quantity);
      } catch (e) {
        await fail(item, index, e);
        // Lo que se tocó mientras tanto se va con el pedido que falló.
        wanted.current.delete(item.id);
        return false;
      }

      // Sin toques nuevos durante el viaje, quedó confirmado. Si los hubo, sale otro con el último.
      if (wanted.current.get(item.id) === quantity) {
        wanted.current.delete(item.id);
        announce(`Cantidad de ${item.producto.nombre}: ${quantity}.`);
        return true;
      }
    }
  }

  function setQuantity(item: CartItem, index: number, quantity: number) {
    setFailure(null);
    wanted.current.set(item.id, quantity);
    setDrafts((current) => ({ ...current, [item.id]: quantity }));
    // Con uno viajando, este sale cuando aquel vuelva.
    if (inFlight.current.has(item.id)) return;

    const work = send(item, index);
    inFlight.current.set(item.id, work);
    void work.finally(() => {
      inFlight.current.delete(item.id);
      setDrafts((current) => without(current, item.id));
    });
  }

  function remove(item: CartItem, index: number) {
    const key = `remove:${item.id}`;
    if (inFlight.current.has(key)) return;

    setFailure(null);
    // Un cambio de cantidad que estaba esperando ya no importa.
    wanted.current.delete(item.id);
    setRemoving((current) => ({ ...current, [item.id]: true }));
    leaving.current = { itemId: item.id, index };

    const work = (async () => {
      try {
        await useCartStore.getState().removeItem(item.id);
      } catch (e) {
        if (toApiError(e).status !== 404) {
          leaving.current = null;
          await fail(item, index, e);
          return false;
        }
        // 404: ya no estaba (se quitó desde otra pestaña). Es lo que se quería: alcanza con ponerse al día.
        await useCartStore.getState().load();
      }
      announce(`Quitaste ${item.producto.nombre} del carrito.`);
      return true;
    })();
    inFlight.current.set(key, work);
    void work.finally(() => {
      inFlight.current.delete(key);
      setRemoving((current) => without(current, item.id));
    });
  }

  /** Espera a que termine todo lo que está viajando. Devuelve si salió bien. */
  async function settle(): Promise<boolean> {
    let ok = true;
    while (inFlight.current.size > 0) {
      const results = await Promise.all(inFlight.current.values());
      if (results.includes(false)) ok = false;
    }
    return ok;
  }

  return { drafts, removing, failure, announcement, setQuantity, remove, settle };
}

type LineProps = {
  item: CartItem;
  /** La cantidad elegida, mientras el backend no la confirma. */
  draft: number | undefined;
  removing: boolean;
  failure: string | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

function CartLine({ item, draft, removing, failure, onQuantityChange, onRemove }: LineProps) {
  const { producto } = item;
  const soldOut = isSoldOut(item);
  const overStock = !soldOut && exceedsStock(item);
  // Mientras viaja el cambio, el selector ya muestra lo pedido; el subtotal espera al backend.
  const quantity = draft ?? item.cantidad;
  const syncing = draft !== undefined;
  const productPath = `/producto/${producto.slug}`;
  // El stock nunca se muestra: el aviso es cualitativo, y dice qué hacer para poder finalizar.
  const stockNotice = soldOut
    ? 'Se quedó sin stock. Quitalo para continuar.'
    : overStock
      ? 'No hay unidades suficientes de este producto, ajustá la cantidad.'
      : null;

  return (
    <li
      aria-busy={syncing || removing}
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
        {/* El anillo de foco lo dibuja el h3: al del enlace lo recortaría el line-clamp. */}
        {/* Tres renglones en la línea angosta, como la card del catálogo: con dos, nombres distintos quedan cortados igual. */}
        <h3 className="line-clamp-3 w-fit max-w-full font-display text-card wrap-break-word text-scaps-text has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-scaps-text @md:line-clamp-2">
          <Link
            id={lineNameId(item.id)}
            to={productPath}
            className="decoration-1 underline-offset-4 outline-none hover:underline"
          >
            {producto.nombre}
          </Link>
        </h3>
        <p className="text-sm wrap-break-word text-scaps-text-muted tabular-nums">
          <span className="sr-only">Precio unitario: </span>
          {formatPrice(producto.precio)}
          <span aria-hidden="true"> c/u</span>
        </p>
        {stockNotice && (
          <div className="mt-1 hidden @md:block">
            <LineNotice>{stockNotice}</LineNotice>
          </div>
        )}
      </div>

      {/* En la línea angosta el aviso va a todo el ancho: al lado de la foto ocuparía cuatro renglones. */}
      {stockNotice && (
        <div className="col-span-full @md:hidden">
          <LineNotice>{stockNotice}</LineNotice>
        </div>
      )}

      <div className={controlsCellClassName}>
        <div>
          {soldOut ? (
            // Sin selector: solo se puede quitar.
            <div className="flex h-11 items-center">
              <SoldOutBadge />
            </div>
          ) : (
            // Por encima del tope (el admin bajó el stock), el componente deshabilita el +
            // y el − baja directo al máximo.
            <QuantitySelector
              value={quantity}
              max={producto.stock}
              onChange={onQuantityChange}
              disabled={removing}
              label={`Cantidad de ${producto.nombre}`}
            />
          )}
        </div>

        <div className={amountCellClassName}>
          {/* active: no cambia nada a la vista, pero hace que el monto reciba sus propios toques. */}
          {/* Sin eso, Chrome en el celular le pasa a Quitar el toque que cae cerca. */}
          <p
            className={`text-base font-medium whitespace-nowrap text-scaps-text tabular-nums transition-opacity duration-200 motion-reduce:transition-none active:text-scaps-text @3xl:flex @3xl:h-11 @3xl:items-center @3xl:justify-end ${syncing ? 'opacity-50' : ''}`}
          >
            <span className="sr-only">Subtotal: </span>
            {formatPrice(item.subtotal)}
          </p>

          {/* Pegado al subtotal cuando van apilados; en una fila, su propia columna. */}
          {/* text-sm: el renglón mide lo que el botón (20 px), no los 24 de la letra heredada. */}
          <div className="text-sm @3xl:flex @3xl:h-11 @3xl:items-center @3xl:justify-self-end">
            {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras quita. */}
            <button
              type="button"
              aria-disabled={removing}
              onClick={() => {
                if (!removing) onRemove();
              }}
              className={`${removeButtonClassName} ${removing ? 'cursor-progress!' : ''}`}
            >
              {removing ? 'Quitando…' : 'Quitar'}
              <span className="sr-only"> {producto.nombre} del carrito</span>
            </button>
          </div>
        </div>
      </div>

      {failure && (
        <div className="col-span-full">
          <LineNotice alert>{sentence(failure)}</LineNotice>
        </div>
      )}
    </li>
  );
}

/** Qué falta para poder finalizar, según qué líneas se pasan del stock. */
function checkoutReason(items: CartItem[]): string | null {
  const soldOut = items.some(isSoldOut);
  const over = items.some((item) => !isSoldOut(item) && exceedsStock(item));
  if (soldOut && over) return 'Ajustá las cantidades marcadas y quitá los productos sin stock para continuar.';
  if (soldOut) return 'Quitá los productos sin stock para continuar.';
  if (over) return 'Ajustá las cantidades marcadas para continuar.';
  return null;
}

type CheckoutProps = {
  total: string;
  /** Hay un cambio viajando: los números todavía no son los finales. */
  updating: boolean;
  /** Por qué no se puede finalizar (alguna línea se pasa del stock), o null. */
  reason: string | null;
  /** Se tocó Finalizar compra con cambios viajando: espera a que terminen. */
  finishing: boolean;
  onCheckout: () => void;
};

type SummaryProps = CheckoutProps & {
  units: number;
  /** La pantalla mira si ya se llegó al resumen, para mostrar o no la barra del celular. */
  ref: (node: HTMLElement | null) => void;
};

function Summary({ units, total, updating, reason, finishing, onCheckout, ref }: SummaryProps) {
  const blocked = reason !== null;
  // Se atenúan los valores, que esperan al backend; los rótulos no.
  const valueClassName = `transition-opacity duration-200 motion-reduce:transition-none ${updating ? 'opacity-50' : ''}`;

  return (
    // sticky: en un carrito largo, el total sigue a la vista mientras se recorren las líneas.
    <aside
      ref={ref}
      aria-labelledby="cart-summary-title"
      className="flex flex-col rounded-scaps border border-scaps-border bg-scaps-card-highlight p-5 md:p-6 lg:sticky lg:top-8"
    >
      <h2 id="cart-summary-title" className="font-display text-2xl font-medium text-scaps-text">
        Resumen
      </h2>
      {/* Los dos números salen del carrito que mandó la API: acá no se suma nada. */}
      <dl aria-busy={updating} className="mt-3">
        <div className="flex items-baseline justify-between gap-4 border-b border-scaps-border py-3 text-sm">
          <dt className="text-scaps-text-secondary">Unidades</dt>
          <dd className={`font-medium text-scaps-text tabular-nums ${valueClassName}`}>{units}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 pt-4">
          <dt className="text-base font-medium text-scaps-text">Total</dt>
          <dd className={`min-w-0 text-2xl font-medium wrap-break-word text-scaps-text tabular-nums ${valueClassName}`}>{formatPrice(total)}</dd>
        </div>
      </dl>

      {/* El único botón del resumen: Seguir comprando va como enlace, así la acción principal no compite.
          aria-disabled y no disabled: con el foco, un lector de pantalla lee el motivo. */}
      <button
        type="button"
        aria-disabled={blocked}
        aria-busy={finishing}
        aria-describedby={blocked ? CHECKOUT_REASON_ID : undefined}
        onClick={() => {
          if (!blocked) onCheckout();
        }}
        className={`mt-6 ${checkoutButtonClassName} ${finishing ? 'cursor-progress' : ''}`}
      >
        {finishing && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
          />
        )}
        Finalizar compra
      </button>
      {reason && (
        <div id={CHECKOUT_REASON_ID} className="mt-3">
          <LineNotice>{reason}</LineNotice>
        </div>
      )}
      <Link to="/catalogo" className={`mt-5 self-center text-sm ${textButtonClassName} text-scaps-text-secondary hover:text-scaps-text`}>
        Seguir comprando
      </Link>
    </aside>
  );
}

/**
 * En el celular, hasta llegar al resumen, el total y Finalizar compra acompañan al pie de la
 * pantalla. Repite al resumen, así que va fuera del Tab y de los lectores de pantalla.
 */
function CheckoutBar({ total, updating, reason, finishing, onCheckout, hidden }: CheckoutProps & { hidden: boolean }) {
  const blocked = reason !== null;

  return (
    // bottom-bar: se dibuja solo donde entra (ver index.css).
    // data-bottom-bar: el aviso de servidor lento sube para no taparla.
    <div
      aria-hidden="true"
      data-bottom-bar={hidden ? undefined : ''}
      className={`fixed inset-x-0 bottom-0 z-40 hidden border-t border-scaps-border bg-scaps-card-highlight px-6 py-3 transition-transform duration-200 motion-reduce:transition-none bottom-bar:block ${hidden ? 'pointer-events-none translate-y-full' : ''}`}
    >
      {reason && <p className="mb-2 text-xs text-scaps-text-secondary">{reason}</p>}
      {/* flex-wrap: con la letra agrandada el botón pasa abajo en vez de recortar el total. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex flex-col whitespace-nowrap">
          <span className="text-xs text-scaps-text-muted">Total</span>
          <span
            className={`text-lg font-medium text-scaps-text tabular-nums transition-opacity duration-200 motion-reduce:transition-none ${updating ? 'opacity-50' : ''}`}
          >
            {formatPrice(total)}
          </span>
        </p>
        {/* onMouseDown: el clic no le da el foco, que quedaría dentro de algo oculto para los lectores de pantalla. */}
        <button
          type="button"
          tabIndex={-1}
          aria-disabled={blocked}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!blocked) onCheckout();
          }}
          className={`${checkoutButtonClassName} ml-auto w-auto! shrink-0 ${finishing ? 'cursor-progress' : ''}`}
        >
          {finishing && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
            />
          )}
          Finalizar compra
        </button>
      </div>
    </div>
  );
}

// Misma forma que el carrito cargado: nada salta cuando llega.
function CartSkeleton() {
  return (
    <div aria-hidden="true" className={`${layoutClassName} motion-safe:animate-pulse`}>
      <div className={`@container ${cardClassName}`}>
        <div className="box-content hidden h-10 rounded-t-[7px] border-b border-scaps-border-row bg-scaps-card-highlight @3xl:block" />
        <ul className="divide-y divide-scaps-border-row">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i} className={lineClassName}>
              <div className={`${imageCellClassName} aspect-square rounded-scaps bg-scaps-placeholder`} />
              {/* Con las clases de letra del nombre y del precio + h-lh, cada barra mide su renglón. */}
              <div className={infoCellClassName}>
                <div className="flex h-lh items-center text-card">
                  <div className="h-4 w-3/4 rounded-full bg-scaps-placeholder" />
                </div>
                <div className="flex h-lh items-center text-sm">
                  <div className="h-3 w-1/3 rounded-full bg-scaps-placeholder" />
                </div>
              </div>
              <div className={controlsCellClassName}>
                <div className="h-11 w-36 rounded-scaps bg-scaps-placeholder" />
                <div className={amountCellClassName}>
                  <div className="flex h-6 items-center justify-end @3xl:h-11">
                    <div className="h-3.5 w-20 rounded-full bg-scaps-placeholder" />
                  </div>
                  <div className="flex h-5 items-center @3xl:h-11 @3xl:justify-self-end">
                    <div className="h-3 w-10 rounded-full bg-scaps-placeholder" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* Sobre el fondo del resumen, el gris de los placeholders casi no se ve: va uno más claro. */}
      {/* Cada bloque mide lo que su parte del resumen: título, Unidades, Total, botón y Seguir comprando. */}
      <div className="flex flex-col rounded-scaps border border-scaps-border bg-scaps-card-highlight p-5 md:p-6">
        <div className="flex h-8 items-center">
          <div className="h-5 w-28 rounded-full bg-scaps-border" />
        </div>
        <div className="mt-3 box-content flex h-11 items-center border-b border-scaps-border">
          <div className="h-3 w-full rounded-full bg-scaps-border" />
        </div>
        <div className="flex h-12 items-end">
          <div className="h-6 w-full rounded-full bg-scaps-border" />
        </div>
        <div className="mt-6 h-12 rounded-scaps bg-scaps-border" />
        <div className="mt-5 flex h-8 items-center justify-center">
          <div className="h-3 w-28 rounded-full bg-scaps-border" />
        </div>
      </div>
    </div>
  );
}

/** Pantalla del carrito. La ruta está protegida: sin sesión manda al login y, al ingresar, vuelve. */
export default function Carrito() {
  const cart = useCartStore((s) => s.cart);
  const status = useCartStatus();
  const loadError = useCartStore((s) => s.error);
  const units = useCartUnitCount();

  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { drafts, removing, failure, announcement, setQuantity, remove, settle } = useLineChanges();
  const [finishing, setFinishing] = useState(false);
  // El resumen, para saber si ya se llegó a él. Hasta medirlo se asume que sí: la barra del celular no asoma de más.
  const [summaryNode, setSummaryNode] = useState<HTMLElement | null>(null);
  const [summaryReached, setSummaryReached] = useState(true);
  useCartRefresh();

  useEffect(() => {
    if (!summaryNode) return;
    // El margen estira la pantalla hacia arriba: el resumen cuenta como alcanzado también cuando quedó atrás.
    // Así la barra no vuelve al seguir bajando, donde taparía el pie de página.
    const observer = new IntersectionObserver(
      (entries) => {
        // Si llegan varios avisos juntos, vale el último.
        setSummaryReached(entries[entries.length - 1].isIntersecting);
      },
      { rootMargin: '100000px 0px 0px 0px' },
    );
    observer.observe(summaryNode);
    return () => observer.disconnect();
  }, [summaryNode]);

  useEffect(() => {
    // La SPA no vuelve sola arriba al cambiar de ruta (se llega, por ejemplo, desde el Ver carrito de la ficha).
    window.scrollTo(0, 0);
    // Llegando por un enlace, el foco va al título: un lector de pantalla anuncia la pantalla.
    if (navigationType !== NavigationType.Pop) focusField(TITLE_ID, { preventScroll: true });
    document.title = 'Carrito | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, [navigationType]);

  const items = cart?.items ?? [];
  const loading = status === 'loading';
  const failed = status === 'error';
  const updating = Object.keys(drafts).length > 0 || Object.keys(removing).length > 0;
  const reason = checkoutReason(items);
  // El aviso de una línea que ya no está (por ejemplo, se quitó desde otra pestaña) va arriba de todo.
  const orphanFailure = failure && !items.some((item) => item.id === failure.itemId) ? failure : null;

  async function checkout() {
    if (finishing) return;
    setFinishing(true);
    // Con cambios viajando, espera: /pedido tiene que mostrar el carrito como quedó.
    const settled = updating ? await settle() : true;
    // Antes de pasar se vuelve a pedir: el stock o un precio pudieron cambiar por otro lado.
    if (settled) await useCartStore.getState().load();
    setFinishing(false);
    const { cart: latest, error } = useCartStore.getState();
    // Si algún cambio falló, se queda acá: el aviso de la línea dice qué pasó.
    // Igual si falló el pedido de recién: su aviso va arriba de la lista.
    if (settled && error === null && latest && isCheckoutReady(latest)) void navigate('/pedido');
  }

  function retry() {
    void useCartStore.getState().load();
    // El botón desaparece al reintentar: el foco va al título en vez de perderse.
    focusField(TITLE_ID);
  }

  return (
    <main data-stable-scrollbar className={pageClassName}>
      <div className={contentClassName}>
        {/* mb en em: la "g" de otros títulos baja de la caja; mismo aire que el catálogo. */}
        <h1 id={TITLE_ID} tabIndex={-1} className="mb-[0.25em] font-display text-title text-scaps-text outline-none">
          Carrito
        </h1>

        {/* Siempre montado: un lector de pantalla oye la carga y cada cambio. */}
        <p role="status" className="sr-only">
          {loading ? 'Cargando tu carrito…' : announcement}
        </p>

        {orphanFailure && (
          <div className="mt-6">
            <FormAlert messages={[sentence(orphanFailure.message)]} />
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
                {/* La columna mide lo que el selector: centrada, queda sobre el número. */}
                <span className="text-center">Cantidad</span>
                <span className="text-right">Subtotal</span>
              </div>
              {/* Vienen ordenadas por nombre desde la API: cambiar una cantidad no mueve la línea. */}
              <ul className="divide-y divide-scaps-border-row">
                {items.map((item, index) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    draft={drafts[item.id]}
                    removing={item.id in removing}
                    failure={failure?.itemId === item.id ? failure.message : null}
                    onQuantityChange={(quantity) => setQuantity(item, index, quantity)}
                    onRemove={() => remove(item, index)}
                  />
                ))}
              </ul>
            </section>

            {cart && (
              <>
                <Summary
                  ref={setSummaryNode}
                  units={units}
                  total={cart.total}
                  updating={updating}
                  reason={reason}
                  finishing={finishing}
                  onCheckout={() => void checkout()}
                />
                <CheckoutBar
                  total={cart.total}
                  updating={updating}
                  reason={reason}
                  finishing={finishing}
                  onCheckout={() => void checkout()}
                  hidden={summaryReached}
                />
              </>
            )}
          </div>
        )}

        {/* Recién con el carrito cargado: antes no se sabe cuáles dejar afuera. */}
        {!loading && !failed && <RelatedProducts excludeSlugs={items.map((item) => item.producto.slug)} />}
      </div>
    </main>
  );
}
