/** Desde cuántas unidades para abajo se avisa que quedan pocas. */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * El cartel de pocas unidades, o null si no va. Nunca lleva el número: el stock
 * es información interna y solo decide cuál de los dos textos va. Con 0 no va:
 * ahí está el de Sin stock, y los dos nunca conviven. La usan la card y la
 * ficha, siempre con el stock que manda la API.
 */
export function lowStockLabel(stock: number): string | null {
  if (stock <= 0 || stock > LOW_STOCK_THRESHOLD) return null;
  return stock === 1 ? 'Última unidad' : 'Últimas unidades';
}
