// Búsqueda, filtros y orden del catálogo. Viajan en la URL con los nombres de
// GET /products (docs/contrato-api, sección 4).

export const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_asc', label: 'Precio: menor a mayor' },
  { value: 'precio_desc', label: 'Precio: mayor a menor' },
  { value: 'nombre_asc', label: 'Nombre: A-Z' },
  { value: 'nombre_desc', label: 'Nombre: Z-A' },
] as const;

export type CatalogSort = (typeof SORT_OPTIONS)[number]['value'];

export interface CatalogFilters {
  q: string;
  sort: CatalogSort;
  /** Solo dígitos; vacío es sin tope. */
  priceMin: string;
  priceMax: string;
  inStock: boolean;
}

const DEFAULT_SORT: CatalogSort = 'recientes';

// Topes de la API: pasarlos es un 400.
export const SEARCH_MAX_LENGTH = 100;
const PRICE_MAX_DIGITS = 8;
const PRICE_PATTERN = /^\d{1,8}$/;

function isSort(value: string | null): value is CatalogSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/** Deja solo los dígitos: quien escribe "10.000" quiere decir diez mil. */
export function cleanPrice(input: string): string {
  return input
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, PRICE_MAX_DIGITS);
}

/** "23000" → "23.000": como se ven los precios en las cards. */
export function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+$)/g, '.');
}

export function isRangeInvalid(priceMin: string, priceMax: string): boolean {
  return priceMin !== '' && priceMax !== '' && Number(priceMin) > Number(priceMax);
}

function readPrice(value: string | null): string {
  return value !== null && PRICE_PATTERN.test(value) ? cleanPrice(value) : '';
}

/** Lo que no es válido se ignora: una URL editada a mano no puede terminar en un 400. */
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  const q = (params.get('q') ?? '').trim();
  const sort = params.get('sort');
  const priceMin = readPrice(params.get('precio_min'));
  const priceMax = readPrice(params.get('precio_max'));
  const rangeInvalid = isRangeInvalid(priceMin, priceMax);

  return {
    q: q.length <= SEARCH_MAX_LENGTH ? q : '',
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    priceMin: rangeInvalid ? '' : priceMin,
    priceMax: rangeInvalid ? '' : priceMax,
    inStock: params.get('en_stock') === 'true',
  };
}

/** Solo lo que tiene valor: la API rechaza un parámetro vacío. */
export function toSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort);
  if (filters.priceMin) params.set('precio_min', filters.priceMin);
  if (filters.priceMax) params.set('precio_max', filters.priceMax);
  if (filters.inStock) params.set('en_stock', 'true');
  return params;
}

export function toApiPath(filters: CatalogFilters, limit: number, page = 1): string {
  const params = toSearchParams(filters);
  params.set('limit', String(limit));
  // La primera página va sin `page`: su ruta es la que recuerda `keep`.
  if (page > 1) params.set('page', String(page));
  return `/products?${params.toString()}`;
}

/** Los filtros de la barra, que en el celular puede estar plegada. */
export function countPanelFilters(filters: CatalogFilters): number {
  return [filters.priceMin, filters.priceMax, filters.inStock].filter(Boolean).length;
}

/** El orden no cuenta: no saca productos de la lista. */
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return filters.q !== '' || countPanelFilters(filters) > 0;
}

/** Sin búsqueda ni filtros, con el orden que ya estaba elegido. */
export function withoutFilters(filters: CatalogFilters): CatalogFilters {
  return { q: '', sort: filters.sort, priceMin: '', priceMax: '', inStock: false };
}
