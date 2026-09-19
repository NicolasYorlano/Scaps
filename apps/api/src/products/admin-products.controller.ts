import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Paginated } from '../common/pagination';
import { AdminProductsService } from './admin-products.service';
import { AdminListProductsQueryDto } from './dto/admin-list-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type { ProductDetailResponse } from './product-response';

// Sin validarlo, un id que no es uuid llega a Prisma y responde 500.
const ProductId = () =>
  Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('El id no es válido') }));

// @Roles en la clase protege todas las rutas, también las que se sumen después.
// Los paths van enteros porque el contrato reparte estas rutas entre
// /admin/products (lecturas) y /products (mutaciones).
@Controller()
@Roles('admin')
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Get('admin/products')
  findAll(@Query() query: AdminListProductsQueryDto): Promise<Paginated<ProductDetailResponse>> {
    return this.products.findAll(query);
  }

  @Get('admin/products/:id')
  findById(@ProductId() id: string): Promise<ProductDetailResponse> {
    return this.products.findById(id);
  }

  @Post('products')
  create(@Body() dto: CreateProductDto): Promise<ProductDetailResponse> {
    return this.products.create(dto);
  }

  @Patch('products/:id')
  update(@ProductId() id: string, @Body() dto: UpdateProductDto): Promise<ProductDetailResponse> {
    return this.products.update(id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@ProductId() id: string): Promise<void> {
    return this.products.remove(id);
  }
}
