import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, type Role } from '../roles';
import type { AuthenticatedRequest } from './jwt-auth.guard';

// JwtAuthGuard ya dejó el usuario en el request: acá solo se lee es_admin.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // getAllAndOverride y no get: permite marcar un controller entero.
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin metadata, alguien puso el guard a mano con @UseGuards. Se deniega:
    // un guard de admin que no sabe qué exigir no debería abrir la puerta.
    if (!roles?.includes('admin')) {
      throw new ForbiddenException('Se requiere rol de administrador'); /* 403 */
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // @Roles aplica los dos guards en orden, así que no debería pasar. Pero
    // `user` está tipado como no opcional y el compilador no lo exige.
    if (!user) {
      throw new UnauthorizedException('Falta el token de autenticación'); /* 401 */
    }

    if (!user.es_admin) {
      throw new ForbiddenException('Se requiere rol de administrador'); /* 403 */
    }

    return true;
  }
}
