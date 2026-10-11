import type { Location } from 'react-router';

// Cuando una ruta protegida manda a alguien a /login, en el `state` de la
// navegación viaja la ruta que había pedido, para volver ahí después.
// Una pantalla pública lo hace con `useLoginRedirect`.

type LoginState = { from: string; fromState: unknown };

// Una sola barra al inicio: "//sitio" y "/\sitio" apuntan a otro sitio.
const INTERNAL_PATH = /^\/(?![/\\])/;

export function loginState(location: Location): LoginState {
  const from = location.pathname + location.search + location.hash;
  const fromState: unknown = location.state;
  return { from, fromState };
}

function readLoginState(state: unknown): LoginState | null {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state;
    if (typeof from === 'string' && INTERNAL_PATH.test(from)) {
      return { from, fromState: 'fromState' in state ? state.fromState : null };
    }
  }

  return null;
}

/** La ruta que guardó `loginState`, o la landing si no vino ninguna. */
export function returnPath(state: unknown): string {
  return readLoginState(state)?.from ?? '/';
}

/** El `state` que tenía esa ruta: la ficha guarda ahí su vuelta al catálogo. */
export function returnState(state: unknown): unknown {
  return readLoginState(state)?.fromState ?? null;
}
