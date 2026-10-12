import type { Cart, CartItem } from '../types/cart';

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

/**
 * La línea pide más unidades de las que hay: el admin bajó el stock después de
 * que se agregó. También con el stock en 0 (la línea queda en Sin stock).
 *
 * La usan la pantalla del carrito, para avisar en la línea, y Finalizar compra,
 * que no deja seguir mientras alguna se pase.
 */
export function exceedsStock(item: CartItem): boolean {
  return item.cantidad > item.producto.stock;
}

/**
 * El carrito se puede cerrar: tiene algo y ninguna línea se pasa del stock.
 * Con esto Finalizar compra se habilita, y /pedido decide si se muestra o
 * manda de vuelta al carrito.
 */
export function isCheckoutReady(cart: Cart): boolean {
  return cart.items.length > 0 && !cart.items.some(exceedsStock);
}
