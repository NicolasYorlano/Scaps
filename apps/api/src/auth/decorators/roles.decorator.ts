import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ROLES_KEY, type Role } from '../roles';

// Marca una ruta (o un controller entero) como exclusiva de administradores.Compuesto
// para que no se pueda marcar una ruta como admin y olvidarse un guard. 
// El orden de los guards importa: JwtAuthGuard carga el usuario, AdminGuard lo lee.
export const Roles = (...roles: Role[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, AdminGuard),
  );
