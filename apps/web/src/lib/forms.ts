// Lo que comparten los formularios.

// Más estricto que type="email", que acepta "juan@mail": el backend no.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | null {
  if (email === '') return 'Ingresá tu email';
  // Mismo texto que devuelve el backend para este caso.
  if (!EMAIL_PATTERN.test(email)) return 'El email no es válido';
  return null;
}

export function focusField(id: string): void {
  document.getElementById(id)?.focus();
}

/** Con pantalla táctil, un campo con foco deja abierto el teclado, que tapa media pantalla. */
export function isTouchScreen(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}
