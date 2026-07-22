import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // El contrato define que toda la API cuelga de /api. /health queda afuera:
  // lo consume la infraestructura (Railway/Render), no el frontend.
  app.setGlobalPrefix('api', { exclude: ['health'] });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
