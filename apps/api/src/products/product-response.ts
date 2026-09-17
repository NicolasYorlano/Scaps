import type { Prisma } from '@prisma/client';
import { toMoney } from '../common/money';

// Lo que muestra una card: sin glb_url ni galería. De las imágenes, la
// principal; si faltara, la de menor orden.
export const CARD_SELECT = {
  id: true,
  nombre: true,
  slug: true,
  precio: true,
  destacado: true,
  stock: true,
  imagenes: {
    select: { url: true, alt: true },
    orderBy: [{ es_principal: 'desc' }, { orden: 'asc' }],
    take: 1,
  },
} satisfies Prisma.ProductoSelect;

export const DETAIL_INCLUDE = {
  imagenes: { orderBy: { orden: 'asc' } },
} satisfies Prisma.ProductoInclude;

type ProductCardRow = Prisma.ProductoGetPayload<{ select: typeof CARD_SELECT }>;
type ProductDetailRow = Prisma.ProductoGetPayload<{
  include: typeof DETAIL_INCLUDE;
}>;

// Las formas exactas del contrato: "card" en el catálogo, "detalle" en la ficha.
export interface ProductCardResponse {
  id: string;
  nombre: string;
  slug: string;
  precio: string;
  destacado: boolean;
  imagen_principal: { url: string; alt: string };
  stock: number;
}

export interface ProductImageResponse {
  id: string;
  url: string;
  alt: string;
  orden: number;
  es_principal: boolean;
}

export interface ProductDetailResponse {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: string;
  stock: number;
  destacado: boolean;
  glb_url: string;
  activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
  imagenes: ProductImageResponse[];
}

// La consulta tiene que excluir los productos sin imágenes: si no, no hay
// imagen_principal que devolver.
export function toProductCard(row: ProductCardRow): ProductCardResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    precio: toMoney(row.precio),
    destacado: row.destacado,
    imagen_principal: row.imagenes[0],
    stock: row.stock,
  };
}

// Allowlist, igual que toUserResponse: un campo que se sume al modelo no sale
// en la respuesta hasta que alguien lo agregue acá.
export function toProductDetail(row: ProductDetailRow): ProductDetailResponse {
  return {
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    descripcion: row.descripcion,
    precio: toMoney(row.precio),
    stock: row.stock,
    destacado: row.destacado,
    glb_url: row.glb_url,
    activo: row.activo,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
    imagenes: row.imagenes.map((imagen) => ({
      id: imagen.id,
      url: imagen.url,
      alt: imagen.alt,
      orden: imagen.orden,
      es_principal: imagen.es_principal,
    })),
  };
}
