import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import type { UserResponse } from '../user-response';

// Lee el usuario que dejó JwtAuthGuard en el request. Solo tiene sentido en
// handlers protegidos por ese guard: sin él, el request no trae usuario.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserResponse =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
