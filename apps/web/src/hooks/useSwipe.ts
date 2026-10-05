import { useRef, type PointerEvent } from 'react';

// Recorrido mínimo del dedo, en px, para contarlo como deslizamiento.
const SWIPE_DISTANCE = 40;

/**
 * Deslizar con el dedo hacia los costados: avisa con 1 (siguiente) o -1 (anterior).
 * El elemento necesita `touch-pan-y`: si no, el navegador se queda con el gesto.
 */
export function useSwipe(onSwipe: (step: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return {
    handlers: {
      onPointerDown(event: PointerEvent) {
        swiped.current = false;
        // Solo el dedo: con mouse, arrastrar no pasa de foto.
        start.current =
          event.pointerType === 'touch'
            ? { x: event.clientX, y: event.clientY }
            : null;
      },
      onPointerUp(event: PointerEvent) {
        const from = start.current;
        start.current = null;
        if (!from) return;

        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;

        swiped.current = true;
        onSwipe(dx < 0 ? 1 : -1);
      },
      onPointerCancel() {
        start.current = null;
      },
    },
    /** El clic que llega después de deslizar no es un toque: quien lo recibe lo descarta con esto. */
    wasSwipe: () => swiped.current,
  };
}
