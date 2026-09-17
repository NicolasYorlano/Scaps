import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [AuthModule, ProductsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
