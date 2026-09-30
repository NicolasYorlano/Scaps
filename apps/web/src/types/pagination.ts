/** Sobre de los listados paginados (GET /products y, más adelante, las órdenes). */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}
