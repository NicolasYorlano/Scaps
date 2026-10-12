import { useEffect, useRef, useState } from 'react';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { toApiError } from '../lib/api';
import { getAvailableToAdd } from '../lib/cart';
import { useCartStatus, useCartStore } from '../stores/cart-store';
import { useSessionStore } from '../stores/session-store';
import type { ProductCard } from '../types/product';

// Lo que dura "Agregado" o "No se pudo agregar" antes de volver al texto de siempre.
// Mientras tanto el botón no suma: un doble clic no agrega dos sin querer.
const FEEDBACK_MS = 1500;

type Feedback = { kind: 'added' | 'failed'; announcement: string };

// relative z-10: queda por encima del enlace estirado de la card, así su clic no abre la ficha.
// hidden md:flex: en el celular no va, igual que antes Ver detalles; la ficha está a un toque.
const baseClassName =
  'relative z-10 hidden h-10 w-full items-center justify-center gap-2 rounded-scaps border text-sm font-medium transition-colors md:flex';
// Con el mouse sobre la card se marca como la acción, como hacía Ver detalles.
const idleClassName =
  'border-scaps-border-input text-scaps-text-secondary group-hover:border-scaps-border-primary group-hover:text-scaps-text-on-primary hover:bg-scaps-card-highlight';
const feedbackClassName = 'cursor-default border-scaps-border-primary text-scaps-text-on-primary';
const unavailableClassName = 'cursor-not-allowed border-scaps-border text-scaps-text-annotation';

/** Agregar al carrito desde la card del catálogo: suma una unidad por clic, sin salir de la grilla. */
export default function AddToCartButton({ product }: { product: ProductCard }) {
  const sessionStatus = useSessionStore((s) => s.status);
  const cartStatus = useCartStatus();
  const cart = useCartStore((s) => s.cart);
  const goToLogin = useLoginRedirect();

  const [adding, setAdding] = useState(false);
  // El candado del doble clic. El estado tarda un render en verse: dos clics
  // que entran juntos leerían los dos adding = false y agregarían dos veces.
  const addingRef = useRef(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const isGuest = sessionStatus === 'anonymous';
  const soldOut = product.stock <= 0;
  // Con sesión, el tope sale del carrito: hasta que cargue no se sabe. También mientras se
  // verifica la sesión. Si la carga del carrito falló, el botón sigue andando: el backend
  // valida el stock igual y su respuesta deja el carrito cargado.
  const waiting = sessionStatus === 'checking' || (!isGuest && cartStatus === 'loading');
  const allInCart = !isGuest && !soldOut && cartStatus === 'ready' && getAvailableToAdd(product, cart) <= 0;
  const unavailable = soldOut || waiting || allInCart;
  const locked = adding || feedback !== null;

  async function handleClick() {
    if (addingRef.current || locked || soldOut) return;
    // Sin sesión el botón se ve igual: manda al login y, después, vuelve al catálogo con los mismos filtros.
    if (isGuest) {
      goToLogin();
      return;
    }
    if (unavailable) return;

    addingRef.current = true;
    setAdding(true);
    let next: Feedback;

    try {
      await useCartStore.getState().addItem(product.id, 1);
      next = { kind: 'added', announcement: `Agregaste ${product.nombre} al carrito.` };
    } catch (e) {
      // El 409 o el 404 (bajó el stock o se dio de baja desde que cargó la grilla) no recargan
      // el catálogo: se perderían las tandas de Cargar más. El contador del navbar no cambia.
      next = { kind: 'failed', announcement: `No se pudo agregar ${product.nombre}. ${toApiError(e).message}` };
    } finally {
      addingRef.current = false;
      setAdding(false);
    }

    setFeedback(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }

  const label = adding
    ? 'Agregando…'
    : feedback?.kind === 'added'
      ? 'Agregado'
      : feedback?.kind === 'failed'
        ? 'No se pudo agregar'
        : allInCart
          ? 'En tu carrito'
          : 'Agregar al carrito';

  const stateClassName = locked
    ? `${feedbackClassName} ${adding ? 'cursor-progress' : ''}`
    : unavailable
      ? unavailableClassName
      : idleClassName;

  return (
    <>
      {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras agrega. */}
      <button
        type="button"
        aria-disabled={unavailable || locked}
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
        {label}
        {/* El texto visible se repite en cada card: el nombre dice de cuál es. */}
        <span className="sr-only">: {product.nombre}</span>
      </button>
      {/* Montado aunque esté vacío: así un lector de pantalla anuncia cómo terminó. */}
      <span role="status" className="sr-only">
        {feedback?.announcement ?? ''}
      </span>
    </>
  );
}
