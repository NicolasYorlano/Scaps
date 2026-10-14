import { useEffect, useId, useRef, useState } from 'react';
import AlertIcon from './AlertIcon';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { ApiError, sentence } from '../lib/api';
import { findCartItem, getAvailableToAdd } from '../lib/cart';
import { cartSettled, useCartStatus, useCartStore } from '../stores/cart-store';
import { useSessionStore } from '../stores/session-store';
import type { ProductCard } from '../types/product';

// Lo que dura el aviso ("Agregado" o el motivo del fallo) antes de volver al texto de siempre.
// Mientras tanto el botón no suma: un doble clic no agrega dos sin querer.
const FEEDBACK_MS = 1500;

type Feedback = { kind: 'added' | 'failed'; label: string; announcement: string };

// relative z-10: queda por encima del enlace estirado de la card, así su clic no abre la ficha.
// hidden md:flex: en el celular no va, igual que antes Ver detalles; la ficha está a un toque.
// El ::after lleva el área táctil a 44 px sin cambiar el alto que se ve: se mide desde
// adentro del borde, así que 3 px son 2 afuera.
const baseClassName =
  'relative z-10 hidden h-10 w-full items-center justify-center gap-2 rounded-scaps border text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-inset-y-0.75 md:flex';
// Se marca con el mouse sobre el botón y no sobre toda la card: el resto de la card abre la ficha.
const idleClassName =
  'border-scaps-border-input text-scaps-text-secondary hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary';
// Agregando y Agregado.
const activeClassName = 'border-scaps-border-primary text-scaps-text-on-primary';
// El fallo no se ve como Agregado: lo distingue el ícono de aviso, como en LineNotice.
const failedClassName = 'cursor-default border-scaps-border-input text-scaps-text';
// "En tu carrito" es el mensaje: se lee con contraste AA. Sin stock, el motivo lo da el cartel.
const inCartClassName = 'cursor-not-allowed border-scaps-border text-scaps-text-muted';
const soldOutClassName = 'cursor-not-allowed border-scaps-border text-scaps-text-annotation';

type Props = {
  product: ProductCard;
  /** El stock más nuevo que conoce la card: el de la grilla o el que supo al agregar. */
  stock: number;
  /** El cartel Sin stock: el motivo del botón deshabilitado. */
  soldOutId: string;
  /** Lo que se supo del stock al agregar o al fallar, sin volver a pedir la grilla. */
  onStockLearned: (stock: number) => void;
};

/** El aviso de un fallo: corto en el botón, completo para un lector de pantalla. */
function failure(error: unknown, name: string): Feedback {
  const apiError = error instanceof ApiError ? error : null;
  let label = 'No se pudo agregar';
  let reason = apiError?.message ?? 'Ocurrió un error inesperado.';

  if (apiError?.status === 401) {
    label = 'Ingresá de nuevo';
    reason = 'Tu sesión venció. Ingresá de nuevo para agregar al carrito.';
  } else if (apiError?.status === 409) {
    label = 'No hay más unidades';
  } else if (apiError?.status === 404) {
    label = 'Ya no está a la venta';
    reason = 'Ya no está a la venta.';
  } else if (apiError?.isNetworkError) {
    label = 'Sin conexión';
  }

  return { kind: 'failed', label, announcement: `No se pudo agregar ${name}. ${sentence(reason)}` };
}

/** Agregar al carrito desde la card del catálogo: suma una unidad por clic, sin salir de la grilla. */
export default function AddToCartButton({ product, stock, soldOutId, onStockLearned }: Props) {
  const sessionStatus = useSessionStore((s) => s.status);
  const cartStatus = useCartStatus();
  const cart = useCartStore((s) => s.cart);
  const goToLogin = useLoginRedirect();
  const allInCartId = useId();

  const [adding, setAdding] = useState(false);
  // El candado del doble clic. El estado tarda un render en verse: dos clics
  // que entran juntos leerían los dos adding = false y agregarían dos veces.
  const addingRef = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isGuest = sessionStatus === 'anonymous';
  const soldOut = stock <= 0;
  // Con el carrito cargado se sabe cuántas hay adentro. Mientras carga, el botón se ve como
  // siempre y un clic lo espera (cartSettled). Si la carga falló, el botón sigue andando:
  // el backend valida el stock y su respuesta deja el carrito cargado.
  const allInCart = !isGuest && cartStatus === 'ready' && !soldOut && getAvailableToAdd({ id: product.id, stock }, cart) <= 0;
  const unavailable = soldOut || allInCart;
  const locked = adding || feedback !== null;

  function showFeedback(next: Feedback) {
    setFeedback(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }

  // Un 409 o un 404 no recargan la grilla (se perderían las tandas de Cargar más): se pide
  // el carrito, que pudo cambiar en otra pestaña, y la card aprende el stock de este producto.
  async function learnAfterFailure(status: number) {
    await useCartStore.getState().load();
    if (status === 404) {
      onStockLearned(0); // dado de baja: la card queda como sin stock
      return;
    }
    // 409: no entra ni una más, así que el stock no pasa de lo que ya está adentro.
    const item = findCartItem(product.id, useCartStore.getState().cart);
    onStockLearned(item ? Math.min(item.producto.stock, item.cantidad) : 0);
  }

  async function handleClick() {
    if (addingRef.current || locked || soldOut) return;
    // Sin sesión el botón se ve igual: manda al login y, después, vuelve al catálogo con los mismos filtros.
    if (isGuest) {
      goToLogin();
      return;
    }
    if (allInCart) return;

    addingRef.current = true;
    setAdding(true);
    let next: Feedback;

    try {
      await cartSettled();
      // El token había vencido: como sin sesión, al login.
      if (useSessionStore.getState().status === 'anonymous') {
        goToLogin();
        return;
      }
      // Con el carrito ya cargado resultó que estaban todas: queda "En tu carrito", sin mandar nada.
      const loaded = useCartStore.getState();
      if (loaded.status === 'ready' && getAvailableToAdd({ id: product.id, stock }, loaded.cart) <= 0) return;

      await loaded.addItem(product.id, 1);
      // La respuesta trae el stock de este momento: le gana al de la grilla.
      const item = findCartItem(product.id, useCartStore.getState().cart);
      if (item) onStockLearned(item.producto.stock);
      next = { kind: 'added', label: 'Agregado', announcement: `Agregaste ${product.nombre} al carrito.` };
    } catch (e) {
      // El contador del navbar no cambia: el carrito queda como estaba.
      next = failure(e, product.nombre);
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) void learnAfterFailure(e.status);
    } finally {
      addingRef.current = false;
      setAdding(false);
    }

    showFeedback(next);
  }

  const label = adding ? 'Agregando…' : feedback ? feedback.label : allInCart ? 'En tu carrito' : 'Agregar al carrito';

  const stateClassName = adding
    ? `${activeClassName} cursor-progress`
    : feedback?.kind === 'added'
      ? `${activeClassName} cursor-default`
      : feedback
        ? failedClassName
        : soldOut
          ? soldOutClassName
          : allInCart
            ? inCartClassName
            : idleClassName;

  return (
    <>
      {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras agrega. */}
      <button
        type="button"
        aria-disabled={unavailable || locked}
        aria-describedby={soldOut ? soldOutId : allInCart ? allInCartId : undefined}
        onClick={() => void handleClick()}
        className={`${baseClassName} ${stateClassName}`}
      >
        {adding && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
          />
        )}
        {feedback?.kind === 'added' && (
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current stroke-[1.5]">
            <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {feedback?.kind === 'failed' && <AlertIcon className="h-4 w-4 shrink-0" />}
        {label}
        {/* El texto visible se repite en cada card: el nombre dice de cuál es. */}
        <span className="sr-only">: {product.nombre}</span>
      </button>
      {/* El motivo de "En tu carrito", para un lector de pantalla. */}
      {allInCart && (
        <span id={allInCartId} hidden>
          Ya tenés en el carrito todas las unidades disponibles.
        </span>
      )}
      {/* Montado aunque esté vacío: así un lector de pantalla anuncia cómo terminó. */}
      <span role="status" className="sr-only">
        {feedback?.announcement ?? ''}
      </span>
    </>
  );
}
