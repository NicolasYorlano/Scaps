import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { ProductImagesService } from './product-images.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  // AuthModule aporta el JwtService que necesitan los guards de @Roles.
  imports: [PrismaModule, AuthModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, AdminProductsService, ProductImagesService],
})
export class ProductsModule {}
