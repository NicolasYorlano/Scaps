import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService, type AuthResult } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { UserResponse } from './user-response';

// Los DTOs se importan como valor (no `import type`): el ValidationPipe los
// necesita en tiempo de ejecución, y un import de tipo se borra al compilar.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  // Nest responde 201 a todo POST. El contrato pide 200 para login, que no
  // crea ningún recurso: sin este @HttpCode el login devuelve 201.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  // Devuelve el usuario actual. Todo el trabajo lo hizo el guard.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }

  // Andamiaje para probar AdminGuard, no está en el contrato: se borra cuando
  // existan los endpoints admin reales. El email confirma que el usuario llegó
  // completo al handler, no solo que el guard dejó pasar.
  @Get('admin-check')
  @Roles('admin')
  adminCheck(@CurrentUser() user: UserResponse): { ok: true; email: string } {
    return { ok: true, email: user.email };
  }
}
