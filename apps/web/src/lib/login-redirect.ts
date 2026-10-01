import type { Location } from 'react-router';

// Cuando una ruta protegida manda a alguien a /login, en el `state` de la
// navegación viaja la ruta que había pedido, para volver ahí después.

export function loginState(location: Location): { from: string } {
  return { from: location.pathname + location.search + location.hash };
}

/** La ruta que guardó `loginState`, o la landing si no vino ninguna. */
export function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    if (typeof from === 'string' && from.startsWith('/')) return from;
  }

  return '/';
}
