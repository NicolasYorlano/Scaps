import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Usuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { toUserResponse, type UserResponse } from './user-response';

// Costo del hash. Cada ronda duplica el trabajo: 10 son ~100ms, suficiente
// para encarecer una fuerza bruta sin que el registro se sienta lento.
const SALT_ROUNDS = 10;

// Hash de descarte, generado con el mismo costo que los reales. Se compara
// contra él cuando el email no existe: sin eso, ese camino responde ~75ms más
// rápido que el de clave incorrecta, y esa diferencia alcanza para averiguar
// qué emails están registrados. Generarlo (no fijarlo como string) lo mantiene
// sincronizado si SALT_ROUNDS cambia.
const DUMMY_HASH = bcrypt.hashSync('no-importa', SALT_ROUNDS);

// Vencimiento del token, fijado por el contrato. No es configuración por
// entorno: vale lo mismo en local que en producción.
const TOKEN_EXPIRATION = '2h';

// Lo que devuelven register y login, según el contrato.
export interface AuthResult {
  user: UserResponse;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          email: dto.email,
          password,
          nombre: dto.nombre,
          apellido: dto.apellido,
        },
      });
      return this.buildResult(usuario);
    } catch (error) {
      // P2002 = violación de índice único, email ya registrado. Se pregunta
      // insertando, no con un findUnique previo: entre "¿existe?" y "creá" hay
      // una ventana en la que otro request puede insertar el mismo email.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado'); /* 409 */
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Fuera del if a propósito: adentro, el || cortocircuitaría y el compare no
    // correría cuando el email no existe. Así los dos caminos tardan lo mismo.
    const passwordOk = await bcrypt.compare(
      dto.password,
      usuario?.password ?? DUMMY_HASH,
    );

    // Un solo error para los dos casos (email inexistente y clave incorrecta):
    // distinguirlos convierte al login en un oráculo para averiguar qué emails
    // están registrados.
    if (!usuario || !passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas'); /* 401 */
    }

    return this.buildResult(usuario);
  }

  // El token lleva solo el id: todo lo demás se lee de la base en cada request
  // autenticado, así no queda una copia vieja de es_admin viajando 2 horas.
  private async buildResult(usuario: Usuario): Promise<AuthResult> {
    const token = await this.jwt.signAsync(
      { sub: usuario.id },
      { expiresIn: TOKEN_EXPIRATION },
    );
    return { user: toUserResponse(usuario), token };
  }
}
