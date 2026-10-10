import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID('all', { message: 'El id del producto no es válido' })
  producto_id: string;

  // Un 0 no quita el ítem: para eso está el DELETE.
  @Min(1, { message: 'La cantidad debe ser 1 o mayor' })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  cantidad: number;
}
