import type { Cart } from '../types/cart';

/**
 * Unidades de un producto que todavía se pueden agregar: el stock menos las que
 * ya están en el carrito. Es el tope del botón Agregar al carrito, en la ficha
 * y en las cards del catálogo.
 *
 * El POST suma a lo que ya había: con el stock solo como tope, quien tiene 3 de
 * 5 podría pedir 5 y se comería un 409. Da 0 o menos cuando ya están todas (o
 * cuando el admin bajó el stock por debajo de lo que hay en el carrito).
 */
export function getAvailableToAdd(product: { id: string; stock: number }, cart: Cart | null): number {
  const inCart = cart?.items.find((item) => item.producto.id === product.id)?.cantidad ?? 0;
  return product.stock - inCart;
}
