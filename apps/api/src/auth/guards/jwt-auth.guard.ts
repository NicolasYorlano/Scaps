import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserResponse, type UserResponse } from '../user-response';

// Todo lo que viaja en el token: el id del usuario.
interface JwtPayload {
  sub: string;
}

// El request que ve un handler protegido, con el usuario ya cargado.
export interface AuthenticatedRequest extends Request {
  user: UserResponse;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      // Firma inválida y token vencido son el mismo 401 para el cliente.
      throw new UnauthorizedException('Token inválido o vencido');
    }

    // Se busca el usuario en vez de confiar en el payload: así es_admin está
    // fresco en cada request y no queda una copia vieja viajando 2 horas.
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    // El token puede ser válido y el usuario ya no existir.
    if (!usuario) {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    request.user = toUserResponse(usuario);
    return true;
  }

  // Espera "Authorization: Bearer <token>". Cualquier otro esquema no cuenta.
  private extractToken(request: Request): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' ? token : undefined;
  }
}
