import { Injectable, NotFoundException} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { paginate, type Paginated } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { ListProductsQueryDto } from './dto/list-products-query.dto';
import { catalogFilters, ORDER_BY } from './product-filters';
import {CARD_SELECT, DETAIL_INCLUDE, toProductCard, toProductDetail, type ProductCardResponse, type ProductDetailResponse} from './product-response';

// Lo que ve el público. Un producto sin imágenes se oculta: no tendría
// imagen_principal y rompería el catálogo.
const PUBLIC_WHERE = {
  activo: true,
  imagenes: { some: {} },
} satisfies Prisma.ProductoWhereInput;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListProductsQueryDto): Promise<Paginated<ProductCardResponse>> {
    const { sort, page, limit } = query;
    const where: Prisma.ProductoWhereInput = { ...PUBLIC_WHERE, ...catalogFilters(query) };

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
