import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // Activa la validación basada en el DTO
      forbidNonWhitelisted: true, // Rechaza la petición si hay datos extra
      transform: true,  // Transforma los payloads a las clases DTO reales
    }),
  );
  app.enableCors({ origin: process.env.CORS_ORIGIN });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
