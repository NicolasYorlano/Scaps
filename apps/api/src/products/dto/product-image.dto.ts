import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

// Una imagen de la galería. El archivo ya está subido: acá viaja su URL. La
// regla básica va al final de cada campo (ver create-product.dto.ts).
export class ProductImageDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'La imagen debe ser una URL https válida' })
  url: string;

  @MaxLength(150, { message: 'El texto alternativo no puede superar los 150 caracteres' })
  @IsString({ message: 'El texto alternativo debe ser texto' })
  @IsNotEmpty({ message: 'El texto alternativo de la imagen es obligatorio' })
  alt: string;

  @IsOptional()
  @Max(1000, { message: 'El orden de la imagen no puede ser mayor que 1000' })
  @Min(0, { message: 'El orden de la imagen debe ser 0 o mayor' })
  @IsInt({ message: 'El orden de la imagen debe ser un número entero' })
  orden?: number;

  @IsOptional()
  @IsBoolean({ message: 'La marca de imagen principal debe ser true o false' })
  es_principal?: boolean;
}
