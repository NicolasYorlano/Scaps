import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Paginated } from '../common/pagination';
import { AdminProductsService } from './admin-products.service';
import { AdminListProductsQueryDto } from './dto/admin-list-products-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductImageDto } from './dto/product-image.dto';
import { SetFeaturedDto } from './dto/set-featured.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImagesService } from './product-images.service';
import type { ProductDetailResponse, ProductImageResponse } from './product-response';

// Sin validarlo, un id que no es uuid llega a Prisma y responde 500.
const ProductId = () =>
  Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('El id no es válido') }));
const ImageId = () =>
  Param('imageId', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('El id de la imagen no es válido') }));

// @Roles en la clase protege todas las rutas. Los paths van enteros porque el 
// contrato reparte estas rutas entre /admin/products (lecturas) y /products (mutaciones).
@Controller()
@Roles('admin')
export class AdminProductsController {
  constructor(
    private readonly products: AdminProductsService,
    private readonly images: ProductImagesService,
  ) {}

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

  @Put('products/featured')
  setFeatured(@Body() dto: SetFeaturedDto): Promise<ProductDetailResponse> {
    return this.products.setFeatured(dto.product_id);
  }

  @Post('products/:id/images')
  addImage(@ProductId() id: string, @Body() dto: ProductImageDto): Promise<ProductImageResponse> {
    return this.images.add(id, dto);
  }

  @Patch('products/:id/images/:imageId')
  updateImage(@ProductId() id: string, @ImageId() imageId: string, @Body() dto: UpdateProductImageDto): Promise<ProductImageResponse> {
    return this.images.update(id, imageId, dto);
  }

  @Delete('products/:id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(@ProductId() id: string, @ImageId() imageId: string): Promise<void> {
    return this.images.remove(id, imageId);
  }
}
