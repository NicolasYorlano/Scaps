import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import type { Cart } from '../types/cart';
import { useSessionStore } from './session-store';

// Única fuente de verdad del carrito en el frontend. Cada endpoint devuelve el
// carrito completo, así que cada acción reemplaza el estado con la respuesta:
// acá no se recalcula nada.
//
// No lo llama ninguna pantalla para cargar o vaciar: se suscribe al store de
// sesión (abajo de todo). Las pantallas solo leen y llaman a las mutaciones.

type CartStatus =
  | 'idle' // sin sesión, o todavía no se pidió
  | 'loading' // primera carga en curso: no hay carrito para mostrar
  | 'ready'
  | 'error'; // falló la primera carga: va el error con Reintentar

type CartStore = {
  cart: Cart | null;
  status: CartStatus;
  /** El último error de `load()`; las mutaciones lanzan el suyo a quien las llamó. */
  error: ApiError | null;
  /** GET /cart. Con un carrito ya cargado (volver a pedirlo después de un 409)
   * lo deja a la vista mientras llega el nuevo. */
  load: () => Promise<void>;
  /** POST /cart/items: suma a la cantidad que ya había. */
  addItem: (productId: string, quantity: number) => Promise<void>;
  /** PATCH /cart/items/:id: reemplaza la cantidad, no suma. */
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  /** DELETE /cart/items/:id. */
  removeItem: (itemId: string) => Promise<void>;
  /** Vuelve al estado sin sesión. */
  reset: () => void;
};

// reset() cambia de sesión: lo que esté viajando de la anterior se descarta,
// así el carrito del usuario que cerró sesión no le aparece al siguiente.
let session = 0;
// Cada pedido lleva un número y solo se aplica una respuesta más nueva que la
// última aplicada: una vieja que llega tarde no pisa el carrito.
let lastStarted = 0;
let lastApplied = 0;
// Las mutaciones van de a una. Dos juntas sobre el mismo carrito chocan en el
// backend (transacciones serializables) y una termina en 409 "Otro cambio se
// hizo al mismo tiempo": pasa con dos clics rápidos o con dos líneas a la vez.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, ['Ocurrió un error inesperado.']);
}

export const useCartStore = create<CartStore>((set, get) => {
  /** Corre un pedido que devuelve el carrito y aplica la respuesta. Devuelve el error, o null. */
  async function run(request: () => Promise<Cart>): Promise<ApiError | null> {
    const ownSession = session;
    const seq = ++lastStarted;

    try {
      const cart = await request();
      if (ownSession !== session || seq <= lastApplied) return null;
      lastApplied = seq;
      set({ cart, status: 'ready', error: null });
      return null;
    } catch (error) {
      const apiError = toApiError(error);
      // 401: el token venció. Se descarta la sesión y la suscripción vacía el carrito.
      if (apiError.status === 401 && ownSession === session) {
        useSessionStore.getState().clearSession();
      }
      return apiError;
    }
  }

  function mutate(request: () => Promise<Cart>): Promise<void> {
    const ownSession = session;

    return enqueue(async () => {
      // Cerró sesión mientras esperaba su turno: ya no se manda.
      if (ownSession !== session) return;
      const error = await run(request);
      // El 409 o el 404 los muestra la pantalla, con el mensaje del backend.
      if (error) throw error;
    });
  }

  return {
    cart: null,
    status: 'idle',
    error: null,

    load: async () => {
      const ownSession = session;
      if (get().cart === null) set({ status: 'loading', error: null });

      const error = await run(() => api.get<Cart>('/cart'));
      // Cerró sesión (o venció) mientras tanto: el carrito ya quedó vacío.
      if (error === null || ownSession !== session) return;
      // Si ya había un carrito, queda a la vista: el error no lo borra.
      set((s) => ({ error, status: s.cart === null ? 'error' : s.status }));
    },

    addItem: (productId, quantity) =>
      mutate(() => api.post<Cart>('/cart/items', { producto_id: productId, cantidad: quantity })),

    updateItem: (itemId, quantity) =>
      mutate(() => api.patch<Cart>(`/cart/items/${itemId}`, { cantidad: quantity })),

    removeItem: (itemId) => mutate(() => api.delete<Cart>(`/cart/items/${itemId}`)),

    reset: () => {
      session++;
      set({ cart: null, status: 'idle', error: null });
    },
  };
});

/** Unidades, no líneas: dos gorras iguales más una distinta son 3. */
export function countUnits(cart: Cart | null): number {
  return cart?.items.reduce((units, item) => units + item.cantidad, 0) ?? 0;
}

/** El número del navbar y de la pantalla del carrito. */
export function useCartUnitCount(): number {
  return useCartStore((s) => countUnits(s.cart));
}

// Cuando aparece un usuario, carga; cuando se va, se vacía. Cubre el arranque
// (hydrate() pone el usuario recién después de que /auth/me confirma el token),
// el login, el registro, el cierre de sesión y el 401 sin tocarlos uno por uno.
// Va a nivel módulo y no en un efecto, así StrictMode no lo duplica.
useSessionStore.subscribe((current, previous) => {
  if (current.user?.id === previous.user?.id) return;

  const cartStore = useCartStore.getState();
  cartStore.reset();
  if (current.status === 'authenticated' && current.user) void cartStore.load();
});
