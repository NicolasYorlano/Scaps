import { BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, type Paginated } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { ListProductsQueryDto, ProductSort} from './dto/list-products-query.dto';
import {CARD_SELECT, DETAIL_INCLUDE, toProductCard, toProductDetail, type ProductCardResponse, type ProductDetailResponse} from './product-response';

// Lo que ve el público. Un producto sin imágenes se oculta: no tendría
// imagen_principal y rompería el catálogo.
const PUBLIC_WHERE = {
  activo: true,
  imagenes: { some: {} },
} satisfies Prisma.ProductoWhereInput;

// El id desempata: sin él, dos productos con el mismo precio pueden cambiar de
// página entre un request y otro.
const ORDER_BY = {
  precio_asc: [{ precio: 'asc' }, { id: 'asc' }],
  precio_desc: [{ precio: 'desc' }, { id: 'asc' }],
  nombre_asc: [{ nombre: 'asc' }, { id: 'asc' }],
  nombre_desc: [{ nombre: 'desc' }, { id: 'asc' }],
  recientes: [{ creado_en: 'desc' }, { id: 'asc' }],
} satisfies Record<ProductSort, Prisma.ProductoOrderByWithRelationInput[]>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListProductsQueryDto): Promise<Paginated<ProductCardResponse>> {
    const { q, precio_min, precio_max, en_stock, sort, page, limit } = query;

    if (
      precio_min &&
      precio_max &&
      new Prisma.Decimal(precio_min).gt(precio_max)
    ) {
      throw new BadRequestException('El precio mínimo no puede ser mayor que el máximo'); /* 400 */
    }

    const search = q?.trim();
    // Prisma ignora las claves en undefined: un filtro sin valor no filtra.
    const where: Prisma.ProductoWhereInput = {
      ...PUBLIC_WHERE,
      nombre: search ? { contains: search, mode: 'insensitive' } : undefined,
      precio: { gte: precio_min, lte: precio_max },
      stock: en_stock ? { gt: 0 } : undefined,
    };

    // En paralelo y no en $transaction: son dos idas y vueltas menos a Neon.
    const [total, rows] = await Promise.all([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where,
        select: CARD_SELECT,
        orderBy: ORDER_BY[sort],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginate(rows.map(toProductCard), total, page, limit);
  }

  async findBySlug(slug: string): Promise<ProductDetailResponse> {
    const product = await this.prisma.producto.findUnique({
      where: { slug, ...PUBLIC_WHERE },
      include: DETAIL_INCLUDE,
    });

    // Un producto inactivo da el mismo 404 que uno inexistente.
    if (!product) {
      throw new NotFoundException('Producto no encontrado'); /* 404 */
    }

    return toProductDetail(product);
  }

  async findFeatured(): Promise<ProductDetailResponse> {
    // Debería haber uno solo; el orden vuelve determinístico en caso de que no.
    const product = await this.prisma.producto.findFirst({
      where: { ...PUBLIC_WHERE, destacado: true },
      include: DETAIL_INCLUDE,
      orderBy: { actualizado_en: 'desc' },
    });

    if (!product) {
      throw new NotFoundException('No hay un producto destacado'); /* 404 */
    }

    return toProductDetail(product);
  }
}
