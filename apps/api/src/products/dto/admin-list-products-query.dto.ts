import { IsBoolean, IsOptional } from 'class-validator';
import { QueryBoolean } from '../../common/query-boolean';
import { ListProductsQueryDto } from './list-products-query.dto';

export class AdminListProductsQueryDto extends ListProductsQueryDto {
  // Omitido trae todos, activos e inactivos.
  @IsOptional()
  @QueryBoolean()
  @IsBoolean({ message: 'El filtro de activo debe ser true o false' })
  activo?: boolean;
}
