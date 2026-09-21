import {IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength} from 'class-validator';
import { MONEY_PATTERN } from '../../common/money';
import { PaginationQueryDto } from '../../common/pagination';
import { QueryBoolean } from '../../common/query-boolean';

export const PRODUCT_SORTS = [
  'precio_asc',
  'precio_desc',
  'nombre_asc',
  'nombre_desc',
  'recientes',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

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

  @IsOptional()
  @QueryBoolean()
  @IsBoolean({ message: 'El filtro de stock debe ser true o false' })
  en_stock?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_SORTS, {message: `El orden debe ser uno de: ${PRODUCT_SORTS.join(', ')}`})
  sort: ProductSort = 'recientes';
}
