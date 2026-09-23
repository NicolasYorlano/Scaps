import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, type Paginated } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminListProductsQueryDto } from './dto/admin-list-products-query.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductImageDto } from './dto/product-image.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { catalogFilters, ORDER_BY } from './product-filters';
import { DETAIL_INCLUDE, toProductDetail, type ProductDetailResponse } from './product-response';
import { RESERVED_SLUGS, slugify } from './slug';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdminListProductsQueryDto): Promise<Paginated<ProductDetailResponse>> {
    const { activo, sort, page, limit } = query;
    // Sin el filtro público: el admin ve también los inactivos y/o sin imágenes.
    const where: Prisma.ProductoWhereInput = { ...catalogFilters(query), activo };

    const [total, rows] = await Promise.all([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: ORDER_BY[sort],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginate(rows.map(toProductDetail), total, page, limit);
  }

  async findById(id: string): Promise<ProductDetailResponse> {
    const product = await this.prisma.producto.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado'); /* 404 */
    }

    return toProductDetail(product);
  }

  async create(dto: CreateProductDto): Promise<ProductDetailResponse> {
    const { imagenes, slug, ...fields } = dto;
    const gallery = withCover(imagenes);

    try {
      // Escritura anidada: Prisma crea el producto y sus imágenes en una sola
      // transacción, así nunca existe un producto sin imagen.
      const product = await this.prisma.producto.create({
        data: {
          ...fields,
          slug: slug ?? (await this.uniqueSlug(slugify(fields.nombre))),
          imagenes: { create: gallery },
        },
        include: DETAIL_INCLUDE,
      });
      return toProductDetail(product);
    } catch (error) {
      // Un slug explícito que ya existe, o dos altas simultáneas con el mismo nombre.
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('El slug ya está en uso'); /* 409 */
      }
      throw error;
    }
  }

  // Nunca toca el slug: la URL queda estable aunque cambie el nombre.
  async update(id: string, dto: UpdateProductDto): Promise<ProductDetailResponse> {
    try {
      const product = await this.prisma.producto.update({
        where: { id },
        // Un producto dado de baja no puede seguir destacado en la landing.
        data: dto.activo === false ? { ...dto, destacado: false } : dto,
        include: DETAIL_INCLUDE,
      });
      return toProductDetail(product);
    } catch (error) {
      throw notFoundIfMissing(error);
    }
  }

  // Baja lógica: la fila queda para no romper carritos ni órdenes que la referencian.
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.producto.update({
        where: { id },
        data: { activo: false, destacado: false },
      });
    } catch (error) {
      throw notFoundIfMissing(error);
    }
  }

  // El primero libre entre base, base-2, base-3… Una sola consulta trae todos
  // los que empiezan igual, incluidos los de productos inactivos.
  private async uniqueSlug(base: string): Promise<string> {
    const rows = await this.prisma.producto.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    const taken = new Set([...RESERVED_SLUGS, ...rows.map((row) => row.slug)]);

    if (!taken.has(base)) {
      return base;
    }

    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) {
      suffix++;
    }
    return `${base}-${suffix}`;
  }
}

// Exactamente una portada. Si no viene marcada, es la primera de la galería
// (menor orden; sin orden, cuenta la posición en la lista).
function withCover(imagenes: ProductImageDto[]) {
  if (imagenes.filter((imagen) => imagen.es_principal).length > 1) {
    throw new BadRequestException('Solo una imagen puede ser la principal'); /* 400 */
  }

  const gallery = imagenes.map((imagen, index) => ({
    url: imagen.url,
    alt: imagen.alt,
    orden: imagen.orden ?? index,
    es_principal: imagen.es_principal ?? false,
  }));

  if (!gallery.some((imagen) => imagen.es_principal)) {
    gallery.reduce((first, imagen) => (imagen.orden < first.orden ? imagen : first)).es_principal = true;
  }

  return gallery;
}

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

// P2025 = el update no encontró la fila.
function notFoundIfMissing(error: unknown): unknown {
  return isPrismaError(error, 'P2025') ? new NotFoundException('Producto no encontrado') /* 404 */ : error;
}
