// La ficha vuelve al catálogo con la búsqueda desde la que se llegó: viaja en
// el `state` del enlace de cada card.

export function catalogState(search: string): { catalogSearch: string } {
  return { catalogSearch: search };
}

/** La ruta que guardó `catalogState`, o el catálogo entero si no vino ninguna. */
export function catalogPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'catalogSearch' in state) {
    const { catalogSearch } = state;
    if (typeof catalogSearch === 'string' && catalogSearch !== '') {
      return `/catalogo?${catalogSearch}`;
    }
  }

  return '/catalogo';
}
