import { useEffect } from 'react';
import { useCartStore } from '../stores/cart-store';

// Viniendo de agregar algo, la copia en memoria tiene segundos: al entrar no se vuelve a pedir.
const FRESH_MS = 30_000;

/**
 * El carrito se carga una vez por sesión. La pantalla que lo muestra lo pone al día al entrar
 * y al volver a la pestaña: pudo cambiar desde otra, o el admin tocó el stock o un precio.
 */
export function useCartRefresh(): void {
  useEffect(() => {
    const { refresh } = useCartStore.getState();
    refresh(FRESH_MS);

    function handleReturn() {
      if (document.visibilityState === 'visible') refresh();
    }

    // focus cubre lo que visibilitychange no ve: dos ventanas a la vista, una al lado de la otra.
    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleReturn);
    };
  }, []);
}
