import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

// Las imágenes se editan desde la galería, y el slug no cambia nunca para que
// la URL del producto quede estable. skipNullProperties en false: sin eso,
// { "nombre": null } pasaría la validación y Prisma respondería 500.
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['imagenes', 'slug'] as const), {
  skipNullProperties: false,
}) {
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser true o false' })
  activo?: boolean;
}
