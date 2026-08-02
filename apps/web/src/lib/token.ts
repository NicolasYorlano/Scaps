// Único lugar donde se nombra la clave del token: el cliente HTTP lee y el store
// de sesión escribe. Duplicar el string es perder la sesión sin error visible.
//
// localStorage y no memoria lo fija el contrato: la vuelta de Mercado Pago
// recarga la página entera. El riesgo lo acota el JWT, que vence a las 2 horas.

const TOKEN_KEY = 'scaps_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
