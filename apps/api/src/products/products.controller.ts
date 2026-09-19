import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Paginated } from '../common/pagination';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import type {ProductCardResponse, ProductDetailResponse} from './product-response';
import { ProductsService } from './products.service';

// Catálogo público: ninguna de estas rutas pide token. El DTO se importa como
// valor porque el ValidationPipe lo necesita en tiempo de ejecución.
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto): Promise<Paginated<ProductCardResponse>> {
    return this.products.findAll(query);
  }

  // Antes que :slug, porque Nest prueba las rutas en orden y tomaría
  // "featured" como un slug.
  @Get('featured')
  findFeatured(): Promise<ProductDetailResponse> {
    return this.products.findFeatured();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<ProductDetailResponse> {
    return this.products.findBySlug(slug);
  }
}
