import { PickType } from '@nestjs/mapped-types';
import { AddCartItemDto } from './add-cart-item.dto';

// La cantidad nueva reemplaza a la que había, con la misma regla que al agregar.
export class UpdateCartItemDto extends PickType(AddCartItemDto, ['cantidad'] as const) {}
