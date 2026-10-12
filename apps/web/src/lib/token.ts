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

/**
 * Avisa cuando otra pestaña cambia el token.
 * 
 * CONTEXTO ARQUITECTÓNICO: Cross-tab Sync
 * ¿Por qué necesitamos escuchar al navegador para sincronizar pestañas?
 * 
 * 1. Memoria Aislada (State/Zustand): Cada pestaña corre su propia copia de la app, 
 *    con su propia RAM. Si la Pestaña A limpia su estado (logout), la Pestaña B 
 *    no se entera y sigue mostrando la sesión abierta.
 * 
 * 2. Disco Compartido (localStorage): todas las pestañas del mismo origen (protocolo,
 *    dominio y puerto) leen y escriben exactamente sobre el mismo almacenamiento.
 * 
 * 3. El Puente (Evento 'storage'): La Pestaña A no puede tocar la RAM de la Pestaña B, pero al
 *    iniciar o cerrar sesión ya guarda o borra el token en localStorage. El navegador avisa de
 *    ese cambio a las demás pestañas con el evento 'storage'. La Pestaña B lo escucha y
 *    actualiza su propia RAM volviendo a verificar el token con el servidor (hydrate).
 * 
 * Problema que resuelve: Si el usuario inicia/cierra sesión en la Pestaña A, o se le vence
 * el token, la Pestaña B debe enterarse para no mostrar datos desactualizados o privados.
 *
 * ¿Cuándo actúa?: El navegador dispara el evento 'storage' automáticamente en todas las
 * pestañas del mismo origen (excepto en la que originó el cambio), y solo si el valor cambió.
 * 
 * listener es un Callback (hydrate(), llega desde App.tsx) que se ejecuta 
 * para actualizar la memoria de la pestaña actual.
 * Cleanup es una función para remover el listener (ideal para el return de un useEffect).
 */
export function onTokenChange(listener: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    // Filtro 1: Ignoramos los cambios de sessionStorage, que disparan este mismo evento.
    if (event.storageArea !== localStorage) return;

    // Filtro 2: Actúa solo si el cambio fue sobre nuestro token, 
    // o si se vació todo el storage de golpe con localStorage.clear() (key === null).
    if (event.key === TOKEN_KEY || event.key === null) {
      listener();
    }
  }

  // Suscripción al aviso nativo del navegador.
  window.addEventListener('storage', handleStorage);

  // Retornamos el cleanup para no dejar escuchas duplicadas: en desarrollo, StrictMode
  // corre el efecto dos veces y, sin él, cada cambio avisaría dos veces.
  return () => window.removeEventListener('storage', handleStorage);
}