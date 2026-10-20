import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { HealthController } from './health/health.controller';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [AuthModule, ProductsModule, CartModule, UploadsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
