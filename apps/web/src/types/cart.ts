// Respuestas de la API del carrito (docs/contrato-api, sección 7). Montos como string, como viajan.
import type { ProductCard } from './product';

/** La card del catálogo sin `destacado`, que el contrato no incluye acá. */
export type CartProduct = Omit<ProductCard, 'destacado'>;

export interface CartItem {
  id: string;
  producto: CartProduct;
  cantidad: number;
  /** Precio por cantidad, calculado por el backend. */
  subtotal: string;
}

/** Lo que devuelven los cuatro endpoints del carrito: siempre el carrito completo. */
export interface Cart {
  id: string;
  /** Ordenados por nombre del producto; los dados de baja no llegan. */
  items: CartItem[];
  total: string;
  actualizado_en: string; // ISO 8601
}
