import { IsBoolean, IsInt, IsNotEmpty, IsString, IsUrl, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// Tope de la galería: vale para el alta y para las que se suman después.
export const MAX_IMAGES = 10;

// Como @IsOptional, pero sin dejar pasar null: en el PATCH de la imagen, un
// { "orden": null } llegaría a Prisma y respondería 500.
const IsOptionalNotNull = () => ValidateIf((_, value) => value !== undefined);

// Una imagen de la galería. El archivo ya está subido: acá viaja su URL. 
export class ProductImageDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'La imagen debe ser una URL https válida' })
  url: string;

  @MaxLength(150, { message: 'El texto alternativo no puede superar los 150 caracteres' })
  @IsString({ message: 'El texto alternativo debe ser texto' })
  @IsNotEmpty({ message: 'El texto alternativo de la imagen es obligatorio' })
  alt: string;

  @IsOptionalNotNull()
  @Max(1000, { message: 'El orden de la imagen no puede ser mayor que 1000' })
  @Min(0, { message: 'El orden de la imagen debe ser 0 o mayor' })
  @IsInt({ message: 'El orden de la imagen debe ser un número entero' })
  orden?: number;

  @IsOptionalNotNull()
  @IsBoolean({ message: 'La marca de imagen principal debe ser true o false' })
  es_principal?: boolean;
}
