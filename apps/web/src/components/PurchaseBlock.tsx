import { useRef, useState } from 'react';
import { Link } from 'react-router';
import QuantitySelector from './QuantitySelector';
import LowStockBadge from './LowStockBadge';
import SoldOutBadge from './SoldOutBadge';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { toApiError } from '../lib/api';
import { getAvailableToAdd } from '../lib/cart';
import { useCartStatus, useCartStore } from '../stores/cart-store';
import { useSessionStore } from '../stores/session-store';
import type { ProductDetail } from '../types/product';

type Props = {
  product: ProductDetail;
  /** Vuelve a pedir la ficha: el stock cambió o el producto se dio de baja. */
  onStale: () => void;
};

// aria-disabled y no disabled, como SubmitButton: el botón conserva el foco
// mientras agrega. Los clics de más los ignora handleAdd.
const addButtonClassName =
  'flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-scaps border border-scaps-border-primary px-4 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight aria-disabled:cursor-not-allowed aria-disabled:border-scaps-border aria-disabled:text-scaps-text-annotation aria-disabled:hover:bg-transparent';

const noticeClassName = 'text-sm text-scaps-text-secondary';

const linkClassName =
  '-my-3 py-3 font-medium whitespace-nowrap text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary';

/** Selector de cantidad y Agregar al carrito, debajo de la descripción de la ficha. El stock nunca se muestra. */
export default function PurchaseBlock({ product, onStale }: Props) {
  const sessionStatus = useSessionStore((s) => s.status);
  const cartStatus = useCartStatus();
  const cart = useCartStore((s) => s.cart);
  const goToLogin = useLoginRedirect();

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  // El candado del doble clic. El estado tarda un render en verse: dos clics
  // que entran juntos leerían los dos adding = false y agregarían dos veces.
  const addingRef = useRef(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGuest = sessionStatus === 'anonymous';
  const soldOut = product.stock <= 0;
  // Con sesión, el tope sale del carrito: hasta que cargue no se sabe. También
  // mientras se verifica la sesión, que todavía no se sabe si hay.
  const waiting = !isGuest && cartStatus !== 'ready';
  // Sin sesión, el tope es el stock.
  const available = isGuest ? product.stock : getAvailableToAdd(product, cart);
  const allInCart = !soldOut && !waiting && available <= 0;
  const showSelector = !soldOut && !allInCart;
  // Mientras espera al carrito, el selector se ve (así nada salta) pero quieto.
  const max = waiting ? Math.max(product.stock, 1) : Math.max(available, 1);
  // Si el tope bajó (cargó el carrito, cambió el stock), la cantidad elegida baja con él.
  const value = Math.min(quantity, max);
  const unavailable = soldOut || allInCart || waiting;

  function changeQuantity(next: number) {
    setQuantity(next);
    setAdded(false);
    setError(null);
  }

  async function handleAdd() {
    if (addingRef.current || soldOut) return;
    // Sin sesión el botón se ve igual: manda al login y después vuelve a esta ficha.
    if (isGuest) {
      goToLogin();
      return;
    }
    if (unavailable) return;

    addingRef.current = true;
    setAdding(true);
    setAdded(false);
    setError(null);

    try {
      await useCartStore.getState().addItem(product.id, value);
      setQuantity(1);
      setAdded(true);
    } catch (e) {
      const apiError = toApiError(e);

      if (apiError.status === 409 || apiError.status === 404) {
        // Entre que cargó la ficha y el clic cambió el stock o se dio de baja:
        // el aviso es el del backend, y la ficha (con un 404, "Producto no
        // encontrado") y el carrito se vuelven a pedir para quedar al día.
        setError(apiError.message);
        onStale();
        void useCartStore.getState().load();
      } else if (apiError.status === 401) {
        // El store ya cerró la sesión: el botón ahora manda al login.
        setError('Tu sesión venció. Ingresá de nuevo para agregar al carrito.');
      } else {
        setError(apiError.message);
      }
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  return (
    <section aria-label="Comprar" className="flex flex-col gap-3 border-t border-scaps-border pt-6">
      {/* Junto al bloque de compra; con 0 va el de Sin stock y LowStockBadge no se dibuja. */}
      {soldOut && <SoldOutBadge className="self-start" />}
      <LowStockBadge stock={product.stock} className="self-start" />

      {/* En una fila en cualquier ancho; el botón se estira hasta el borde. */}
      <div className="flex items-start gap-3">
        {showSelector && (
          <QuantitySelector
            value={value}
            max={max}
            onChange={changeQuantity}
            disabled={waiting || adding}
            label={`Cantidad de ${product.nombre}`}
          />
        )}
        <button
          type="button"
          aria-disabled={unavailable || adding}
          onClick={() => void handleAdd()}
          className={`${addButtonClassName} ${adding ? 'cursor-progress' : ''}`}
        >
          {adding && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
            />
          )}
          {adding ? 'Agregando…' : 'Agregar al carrito'}
        </button>
      </div>

      {/* Primero lo que acaba de pasar. Montado aunque esté vacío: así un lector de pantalla lo anuncia.
          Vacío, el margen negativo descuenta su gap, así no separa de más a lo que sigue. */}
      <p role="status" className={`${noticeClassName} -mt-3 not-empty:mt-0`}>
        {added && (
          <>
            Agregado al carrito.{' '}
            {/* Con todas en el carrito, el enlace ya está en el aviso de abajo. */}
            {!allInCart && (
              <Link to="/carrito" className={linkClassName}>
                Ver carrito
              </Link>
            )}
          </>
        )}
      </p>

      {allInCart && (
        <p className={noticeClassName}>
          Ya tenés en el carrito todas las unidades disponibles.{' '}
          <Link to="/carrito" className={linkClassName}>
            Ver carrito
          </Link>
        </p>
      )}

      {!isGuest && cartStatus === 'error' && (
        <p role="alert" className={noticeClassName}>
          No pudimos cargar tu carrito.{' '}
          <button
            type="button"
            onClick={() => void useCartStore.getState().load()}
            className={linkClassName}
          >
            Reintentar
          </button>
        </p>
      )}

      {error && (
        <p role="alert" className={noticeClassName}>
          {error}
        </p>
      )}
    </section>
  );
}
