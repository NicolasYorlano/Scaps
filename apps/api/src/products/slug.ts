// Slugs que chocan con rutas fijas bajo /products: GET /products/featured
// taparía la ficha de un producto con ese slug.
export const RESERVED_SLUGS = ['featured'];

// Minúsculas y números, con un guion simple entre palabras: "gorra-trucker-negra".
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// "Gorra Ñandú Negra" → "gorra-nandu-negra". NFD separa cada letra de su tilde,
// y el primer replace descarta las tildes.
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Un nombre sin letras ni números latinos no deja nada para el slug.
  return slug || 'producto';
}
