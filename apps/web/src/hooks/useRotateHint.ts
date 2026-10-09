import { useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';

// Arrastre mínimo, en px, para dar el modelo por rotado: un toque no cuenta.
const DRAG_THRESHOLD = 8;

/**
 * Cuándo mostrar la ayuda de un visor 3D. `rotated`: ya lo giraron, con un arrastre o con las flechas.
 * `viewerFocused`: el visor tiene el foco del teclado. Los handlers van en el contenedor del visor.
 */
export function useRotateHint() {
  const [rotated, setRotated] = useState(false);
  const [viewerFocused, setViewerFocused] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  return {rotated, viewerFocused, handlers: {
      onPointerDown(event: PointerEvent) {
        dragStart.current = { x: event.clientX, y: event.clientY };
      },
      onPointerMove(event: PointerEvent) {
        const from = dragStart.current;
        if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > DRAG_THRESHOLD) {
          setRotated(true);
        }
      },
      onPointerUp() {
        dragStart.current = null;
      },
      onPointerCancel() {
        dragStart.current = null;
      },
      onKeyDown(event: KeyboardEvent) {
        // Las teclas con las que rota ModelViewer.
        if (event.key.startsWith('Arrow')) setRotated(true);
      },
      onFocus(event: FocusEvent) {
        setViewerFocused(event.target.matches(':focus-visible'));
      },
      onBlur() {
        setViewerFocused(false);
      },
    },
  };
}
