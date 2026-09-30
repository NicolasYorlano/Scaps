// Respuestas de la API de productos (docs/contrato-api, sección 4). Montos como string, como viajan.

/** No se llama ProductImage para no chocar con el componente. */
export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  orden: number;
  es_principal: boolean;
}

/** Ítem de GET /products. */
export interface ProductCard {
  id: string;
  nombre: string;
  slug: string;
  precio: string;
  destacado: boolean;
  imagen_principal: Pick<GalleryImage, 'url' | 'alt'>;
  stock: number;
}

/** GET /products/:slug y GET /products/featured. */
export interface ProductDetail {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: string;
  stock: number;
  destacado: boolean;
  glb_url: string;
  activo: boolean;
  creado_en: string; // ISO 8601
  actualizado_en: string; // ISO 8601
  /** Ordenadas por `orden`. */
  imagenes: GalleryImage[];
}
