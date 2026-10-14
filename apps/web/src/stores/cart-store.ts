import { create } from 'zustand';
import { api, ApiError, toApiError } from '../lib/api';
import type { Cart } from '../types/cart';
import { useSessionStore } from './session-store';

// Única fuente de verdad del carrito en el frontend. Cada endpoint devuelve el
// carrito completo, así que cada acción reemplaza el estado con la respuesta:
// acá no se recalcula nada.
//
// Carga y se vacía solo, suscripto al store de sesión (abajo de todo). Las
// pantallas leen, mutan y llaman a load() para reintentar o ponerse al día.

type CartStatus =
  | 'idle' // sin sesión, o todavía no se pidió
  | 'loading' // primera carga en curso: no hay carrito para mostrar
  | 'ready'
  | 'error'; // falló la primera carga: va el error con Reintentar

/** Respuesta de POST /cart/purchase: lo que se descontó y el carrito, ya vacío. */
type PurchaseResponse = { compra: Cart; carrito: Cart };

type CartStore = {
  cart: Cart | null;
  status: CartStatus;
  /** El último error de `load()`; las mutaciones lanzan el suyo a quien las llamó. */
  error: ApiError | null;
  /** Cuándo llegó el último carrito, de un GET o de un cambio. */
  syncedAt: number;
  /** GET /cart. Con un carrito ya cargado (volver a pedirlo después de un 409)
   * lo deja a la vista mientras llega el nuevo. */
  load: () => Promise<void>;
  /** POST /cart/items: suma a la cantidad que ya había. */
  addItem: (productId: string, quantity: number) => Promise<void>;
  /** PATCH /cart/items/:id: reemplaza la cantidad, no suma. */
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  /** DELETE /cart/items/:id. */
  removeItem: (itemId: string) => Promise<void>;
  /** POST /cart/purchase, la compra simulada: deja el carrito vacío y devuelve lo que se compró. */
  purchase: () => Promise<Cart>;
  /** Para las pantallas que lo muestran: lo vuelve a pedir si la copia tiene más de `maxAge` ms. */
  refresh: (maxAge?: number) => void;
  /** Vuelve al estado sin sesión. */
  reset: () => void;
};

// reset() cambia de sesión: lo que esté viajando de la anterior se descarta,
// así el carrito del usuario que cerró sesión no le aparece al siguiente.
let session = 0;
// Los pedidos van de a uno, la carga incluida: cada respuesta trae el carrito
// entero, y dos que se cruzan pueden llegar en otro orden que el del servidor.
let queue: Promise<unknown> = Promise.resolve();
// El GET que está en la fila o viajando: pedirlo de nuevo mientras tanto devuelve ese mismo.
let pendingLoad: Promise<void> | null = null;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}

export const useCartStore = create<CartStore>((set, get) => {
  /** Corre un pedido que devuelve el carrito y aplica la respuesta. Devuelve el error, o null. */
  async function run(request: () => Promise<Cart>): Promise<ApiError | null> {
    const ownSession = session;

    try {
      const cart = await request();
      if (ownSession === session) {
        set({ cart, status: 'ready', error: null, syncedAt: Date.now() });
      }
      return null;
    } catch (error) {
      const apiError = toApiError(error);
      // 401: el token venció. Se descarta la sesión y la suscripción vacía el carrito.
      if (apiError.status === 401 && ownSession === session) {
        useSessionStore.getState().expireSession();
      }
      return apiError;
    }
  }

  function mutate(request: () => Promise<Cart>): Promise<void> {
    const ownSession = session;

    return enqueue(async () => {
      // Cerró sesión mientras esperaba su turno: ya no se manda.
      // Rechaza, para que quien la pidió no la dé por hecha.
      if (ownSession !== session) {
        throw new ApiError(401, ['Tu sesión se cerró. Ingresá de nuevo.']);
      }
      const error = await run(request);
      // El 409 o el 404 los muestra la pantalla, con el mensaje del backend.
      if (error) throw error;
    });
  }

  return {
    cart: null,
    status: 'idle',
    error: null,
    syncedAt: 0,

    load: () => {
      // Solo con sesión: sin ella, GET /cart da 401.
      if (useSessionStore.getState().status !== 'authenticated') return Promise.resolve();
      // Con la fila única, el que ya está pedido sale después del último cambio: sirve igual.
      if (pendingLoad) return pendingLoad;
      const ownSession = session;
      if (get().cart === null) set({ status: 'loading', error: null });

      const pending = enqueue(async () => {
        if (ownSession !== session) return;
        const error = await run(() => api.get<Cart>('/cart'));
        // Cerró sesión (o venció) mientras tanto: el carrito ya quedó vacío.
        if (error === null || ownSession !== session) return;
        // Si ya había un carrito, queda a la vista: el error no lo borra.
        set((s) => ({ error, status: s.cart === null ? 'error' : s.status }));
      });
      pendingLoad = pending;
      void pending.finally(() => {
        if (pendingLoad === pending) pendingLoad = null;
      });
      return pending;
    },

    addItem: (productId, quantity) =>
      mutate(() => api.post<Cart>('/cart/items', { producto_id: productId, cantidad: quantity })),

    updateItem: (itemId, quantity) =>
      mutate(() => api.patch<Cart>(`/cart/items/${itemId}`, { cantidad: quantity })),

    removeItem: (itemId) => mutate(() => api.delete<Cart>(`/cart/items/${itemId}`)),

    purchase: () => {
      const ownSession = session;

      // En la fila y con el mismo cuidado que mutate().
      return enqueue(async () => {
        if (ownSession !== session) {
          throw new ApiError(401, ['Tu sesión se cerró. Ingresá de nuevo.']);
        }
        // Un solo pedido: run() deja en el store el carrito vacío, y la compra va a quien la pidió.
        const response = api.post<PurchaseResponse>('/cart/purchase');
        const error = await run(() => response.then(({ carrito }) => carrito));
        if (error) throw error;
        return (await response).compra;
      });
    },

    refresh: (maxAge = 0) => {
      if (Date.now() - get().syncedAt >= maxAge) void get().load();
    },

    reset: () => {
      session++;
      // La sesión nueva no espera a los pedidos de la anterior.
      queue = Promise.resolve();
      pendingLoad = null;
      set({ cart: null, status: 'idle', error: null, syncedAt: 0 });
    },
  };
});

/** Unidades, no líneas: dos gorras iguales más una distinta son 3. */
function countUnits(cart: Cart | null): number {
  return cart?.items.reduce((units, item) => units + item.cantidad, 0) ?? 0;
}

/** El número del navbar y de la pantalla del carrito. */
export function useCartUnitCount(): number {
  return useCartStore((s) => countUnits(s.cart));
}

/** Para las pantallas: `idle` cuenta como cargando, porque con sesión no llega a dibujarse. */
export function useCartStatus(): Exclude<CartStatus, 'idle'> {
  return useCartStore((s) => (s.status === 'idle' ? 'loading' : s.status));
}

/**
 * Se cumple cuando ya se sabe si hay sesión y, con sesión, el carrito terminó
 * de cargar (bien o mal). Un clic que llega antes espera esto en vez de perderse.
 */
export function cartSettled(): Promise<void> {
  const settled = () => {
    const session = useSessionStore.getState().status;
    const cart = useCartStore.getState().status;
    return session === 'anonymous' || (session === 'authenticated' && (cart === 'ready' || cart === 'error'));
  };
  if (settled()) return Promise.resolve();

  return new Promise((resolve) => {
    const stops: (() => void)[] = [];
    const check = () => {
      if (!settled()) return;
      for (const stop of stops) stop();
      resolve();
    };
    stops.push(useSessionStore.subscribe(check), useCartStore.subscribe(check));
  });
}

// Cuando aparece un usuario, carga; cuando se va, se vacía. Cubre el arranque
// (hydrate() pone el usuario recién después de que /auth/me confirma el token),
// el login, el registro, el cierre de sesión y el 401 sin tocarlos uno por uno.
// Va a nivel módulo y no en un efecto, así StrictMode no lo duplica.
const unsubscribe = useSessionStore.subscribe((current, previous) => {
  if (current.user?.id === previous.user?.id) return;

  const cartStore = useCartStore.getState();
  cartStore.reset();
  if (current.status === 'authenticated' && current.user) void cartStore.load();
});

// En desarrollo, al guardar este archivo el módulo se evalúa de nuevo con la
// sesión ya iniciada: la copia vieja suelta su suscripción y la nueva carga.
import.meta.hot?.dispose(unsubscribe);
if (useSessionStore.getState().status === 'authenticated') void useCartStore.getState().load();
