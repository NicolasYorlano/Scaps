import { IsUUID } from 'class-validator';

export class SetFeaturedDto {
  @IsUUID('all', { message: 'El id del producto no es válido' })
  product_id: string;
}
