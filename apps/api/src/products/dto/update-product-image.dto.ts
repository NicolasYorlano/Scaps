import { OmitType, PartialType } from '@nestjs/mapped-types';
import { ProductImageDto } from './product-image.dto';

// La url no se edita: una foto nueva es una imagen nueva. skipNullProperties en
// false: sin eso, { "alt": null } pasaría la validación y Prisma respondería 500.
export class UpdateProductImageDto extends PartialType(OmitType(ProductImageDto, ['url'] as const), {skipNullProperties: false}) {}
