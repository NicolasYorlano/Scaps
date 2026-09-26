import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_IMAGES, type ProductImageDto } from './dto/product-image.dto';
import type { UpdateProductImageDto } from './dto/update-product-image.dto';
import { toProductImage, type ProductImageResponse } from './product-response';

// La galería después del alta. La base no garantiza "una sola portada" ni
// "al menos una imagen", así que cada operación lee y escribe en una misma
// transacción serializable.
@Injectable()
export class ProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  add(productId: string, dto: ProductImageDto): Promise<ProductImageResponse> {
    return this.prisma.serializable(async (tx) => {
      const product = await tx.producto.findUnique({
        where: { id: productId },
        select: { imagenes: { select: { orden: true, es_principal: true } } },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado'); /* 404 */
      }
      if (product.imagenes.length >= MAX_IMAGES) {
        throw new ConflictException(`El producto ya tiene ${MAX_IMAGES} imágenes`); /* 409 */
      }

      // Si el producto no tuviera portada, la nueva lo es aunque no venga marcada.
      const hasCover = product.imagenes.some((imagen) => imagen.es_principal);
      const esPrincipal = dto.es_principal === true || !hasCover;
      if (esPrincipal) {
        await unmarkCover(tx, productId);
      }

      // Sin orden, va al final de la galería.
      const nextOrden = Math.max(-1, ...product.imagenes.map((imagen) => imagen.orden)) + 1;
      const image = await tx.productoImagen.create({
        data: {
          producto_id: productId,
          url: dto.url,
          alt: dto.alt,
          orden: dto.orden ?? nextOrden,
          es_principal: esPrincipal,
        },
      });
      return toProductImage(image);
    });
  }

  update(productId: string, imageId: string, dto: UpdateProductImageDto): Promise<ProductImageResponse> {
    return this.prisma.serializable(async (tx) => {
      const image = await tx.productoImagen.findFirst({
        where: { id: imageId, producto_id: productId },
      });

      // Una imagen de otro producto da el mismo 404 que una inexistente.
      if (!image) {
        throw new NotFoundException('Imagen no encontrada'); /* 404 */
      }
      // Desmarcarla dejaría el producto sin portada: la portada cambia marcando otra.
      if (dto.es_principal === false && image.es_principal) {
        throw new ConflictException('La imagen principal no se puede desmarcar: marcá otra como principal'); /* 409 */
      }
      if (dto.es_principal === true && !image.es_principal) {
        await unmarkCover(tx, productId);
      }

      const updated = await tx.productoImagen.update({ where: { id: imageId }, data: dto });
      return toProductImage(updated);
    });
  }

  // Borra solo el registro: el archivo queda en R2.
  async remove(productId: string, imageId: string): Promise<void> {
    await this.prisma.serializable(async (tx) => {
      const images = await tx.productoImagen.findMany({
        where: { producto_id: productId },
        select: { id: true, es_principal: true },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      });
      const image = images.find((imagen) => imagen.id === imageId);

      if (!image) {
        throw new NotFoundException('Imagen no encontrada'); /* 404 */
      }
      // Relación 1..*: un producto no existe sin imagen.
      if (images.length === 1) {
        throw new ConflictException('No se puede borrar la única imagen del producto: para quitarla, se da de baja el producto'); /* 409 */
      }

      await tx.productoImagen.delete({ where: { id: imageId } });

      // Si se fue la portada, la reemplaza la de menor orden, igual que en el alta.
      const next = images.find((imagen) => imagen.id !== imageId);
      if (image.es_principal && next) {
        await tx.productoImagen.update({ where: { id: next.id }, data: { es_principal: true } });
      }
    });
  }
}

function unmarkCover(tx: Prisma.TransactionClient, productId: string) {
  return tx.productoImagen.updateMany({
    where: { producto_id: productId, es_principal: true },
    data: { es_principal: false },
  });
}
