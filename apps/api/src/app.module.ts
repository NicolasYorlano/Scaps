import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { HealthController } from './health/health.controller';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [AuthModule, ProductsModule, CartModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
