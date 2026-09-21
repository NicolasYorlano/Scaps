import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ListProductsQueryDto, ProductSort } from './dto/list-products-query.dto';

// El id desempata: sin él, dos productos con el mismo precio pueden cambiar de
// página entre un request y otro.
export const ORDER_BY = {
  precio_asc: [{ precio: 'asc' }, { id: 'asc' }],
  precio_desc: [{ precio: 'desc' }, { id: 'asc' }],
  nombre_asc: [{ nombre: 'asc' }, { id: 'asc' }],
  nombre_desc: [{ nombre: 'desc' }, { id: 'asc' }],
  recientes: [{ creado_en: 'desc' }, { id: 'asc' }],
} satisfies Record<ProductSort, Prisma.ProductoOrderByWithRelationInput[]>;

// Búsqueda, rango de precio y stock: lo que comparten el catálogo público y el
// listado del admin. Prisma ignora las claves en undefined.
export function catalogFilters(query: ListProductsQueryDto): Prisma.ProductoWhereInput {
  const { q, precio_min, precio_max, en_stock } = query;

  if (precio_min && precio_max && new Prisma.Decimal(precio_min).gt(precio_max)) {
    throw new BadRequestException('El precio mínimo no puede ser mayor que el máximo'); /* 400 */
  }

  const search = q?.trim();
  return {
    nombre: search ? { contains: search, mode: 'insensitive' } : undefined,
    precio: { gte: precio_min, lte: precio_max },
    stock: en_stock ? { gt: 0 } : undefined,
  };
}
