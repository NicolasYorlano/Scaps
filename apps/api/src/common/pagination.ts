import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const MAX_LIMIT = 50;
// Sin tope, un page enorme desborda el OFFSET y Prisma responde 500.
const MAX_PAGE = 10_000;

// Query params de cualquier listado paginado. Llegan como texto: @Type los
// convierte a número antes de validar.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser 1 o mayor' })
  @Max(MAX_PAGE, { message: `La página no puede ser mayor que ${MAX_PAGE}` })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser 1 o mayor' })
  @Max(MAX_LIMIT, { message: `El límite no puede ser mayor que ${MAX_LIMIT}` })
  limit: number = 20;
}

// El sobre de los listados paginados, según el contrato.
export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    data,
    meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}
