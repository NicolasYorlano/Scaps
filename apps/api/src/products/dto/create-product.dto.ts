import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNotIn, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateNested} from 'class-validator';
import { RESERVED_SLUGS, SLUG_PATTERN } from '../slug';
import { ProductImageDto } from './product-image.dto';

// El formato de los montos (ver common/money.ts) con al menos un dígito
// distinto de 0, que en ese formato equivale a ser mayor que 0.
const POSITIVE_MONEY_PATTERN = /^(?=.*[1-9])\d{1,8}(\.\d{1,2})?$/;

// Más que cualquier stock real. Sin tope, un número enorme desborda el Int de
// la columna y Prisma responde 500.
const MAX_STOCK = 1_000_000;

// class-validator devuelve los mensajes de abajo hacia arriba y el front
// muestra el primero: la regla básica (obligatorio, tipo) va al final.
export class CreateProductDto {
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsOptional()
  @MaxLength(2000, { message: 'La descripción no puede superar los 2000 caracteres' })
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string | null;

  // Como string y no como número de JSON, que pasaría por float.
  @Matches(POSITIVE_MONEY_PATTERN, {message: 'El precio debe ser mayor que 0 y venir como texto, por ejemplo "15999.00"'})
  precio: string;

  @Max(MAX_STOCK, { message: `El stock no puede ser mayor que ${MAX_STOCK}` })
  @Min(0, { message: 'El stock no puede ser negativo' })
  @IsInt({ message: 'El stock debe ser un número entero' })
  stock: number;

  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'El modelo 3D debe ser una URL https válida' })
  glb_url: string;

  @ArrayMaxSize(10, { message: 'El producto no puede tener más de 10 imágenes' })
  @IsArray({ message: 'Las imágenes deben ser una lista' })
  @ArrayMinSize(1, { message: 'El producto necesita al menos una imagen' })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  imagenes: ProductImageDto[];

  // Si no viene, se genera a partir del nombre.
  @IsOptional()
  @IsNotIn(RESERVED_SLUGS, { message: 'Ese slug está reservado' })
  @MaxLength(100, { message: 'El slug no puede superar los 100 caracteres' })
  @Matches(SLUG_PATTERN, { message: 'El slug solo puede tener minúsculas, números y guiones' })
  slug?: string;
}
