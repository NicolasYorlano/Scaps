// Las reglas de las imágenes de un producto: las comparten el alta y la galería de la edición.

// El tope del contrato: entre 1 y 10 imágenes por producto.
export const MAX_IMAGES = 10;
// El tope del backend para el texto alternativo.
export const MAX_ALT_LENGTH = 150;

/** El texto alternativo es obligatorio: lo leen los lectores de pantalla. */
export function altError(alt: string): string | null {
  return alt.trim() === '' ? 'Ingresá el texto alternativo' : null;
}
