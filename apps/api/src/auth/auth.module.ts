import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    // registerAsync, no register: la fábrica corre al levantar la app, así que
    // un JWT_SECRET faltante rompe el arranque con un mensaje que dice qué
    // falta, en vez de explotar recién cuando alguien intenta loguearse.
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'Falta la variable de entorno JWT_SECRET (ver apps/api/.env.example).',
          );
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
