import { Transform } from 'class-transformer';
import {IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export const PRODUCT_SORTS = [
  'precio_asc',
  'precio_desc',
  'nombre_asc',
  'nombre_desc',
  'recientes',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

// Monto sin signo, con punto decimal y con hasta dos decimales. Queda como string: así nunca pasa por un float.
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(100, {message: 'La búsqueda no puede superar los 100 caracteres'})
  q?: string;

  @IsOptional()
  @Matches(MONEY_PATTERN, {message: 'El precio mínimo debe ser un monto válido'})
  precio_min?: string;

  @IsOptional()
  @Matches(MONEY_PATTERN, {message: 'El precio máximo debe ser un monto válido'})
  precio_max?: string;

  // Boolean('false') es true, así que se convierte a mano. Cualquier otro valor queda como está y lo rechaza @IsBoolean.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'El filtro de stock debe ser true o false' })
  en_stock?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_SORTS, {message: `El orden debe ser uno de: ${PRODUCT_SORTS.join(', ')}`})
  sort: ProductSort = 'recientes';
}
