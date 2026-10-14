import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { isPrismaError } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_WHERE } from '../products/product-filters';
import { CART_SELECT, toCart, type CartResponse, type PurchaseResponse } from './cart-response';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

// Un carrito por usuario, que se crea solo la primera vez que hace falta. Las
// tres mutaciones devuelven el carrito entero, igual que el GET.
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string): Promise<CartResponse> {
    try {
      const cart = await this.prisma.carrito.upsert({
        where: { usuario_id: userId },
        update: {},
        create: { usuario_id: userId },
        select: CART_SELECT,
      });
      return toCart(cart);
    } catch (error) {
      // Con el update vacío, Prisma busca y después crea: dos primeros pedidos
      // simultáneos chocan (P2002). El carrito ya existe, alcanza con leerlo.
      if (!isPrismaError(error, 'P2002')) {
        throw error;
      }
      return this.read(userId);
    }
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponse> {
    await this.prisma.serializable(async (tx) => {
      const product = await tx.producto.findUnique({
        where: { ...PUBLIC_WHERE, id: dto.producto_id },
        select: { nombre: true, stock: true },
      });

      // Un producto dado de baja da el mismo 404 que uno inexistente.
      if (!product) {
        throw new NotFoundException('Producto no encontrado'); /* 404 */
      }

      const cart = await touchCart(tx, userId);
      const key = { carrito_id: cart.id, producto_id: dto.producto_id };
      const item = await tx.itemCarrito.findUnique({
        where: { carrito_id_producto_id: key },
        select: { cantidad: true },
      });

      // Suma a lo que ya había: el tope vale para el total de la línea.
      if ((item?.cantidad ?? 0) + dto.cantidad > product.stock) {
        throw insufficientStock(product.nombre);
      }

      await tx.itemCarrito.upsert({
        where: { carrito_id_producto_id: key },
        update: { cantidad: { increment: dto.cantidad } },
        create: { ...key, cantidad: dto.cantidad },
      });
    });

    return this.read(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartResponse> {
    await this.prisma.serializable(async (tx) => {
      const item = await tx.itemCarrito.findFirst({
        where: { id: itemId, carrito: { usuario_id: userId }, producto: PUBLIC_WHERE },
        select: { producto: { select: { nombre: true, stock: true } } },
      });

      // Un ítem ajeno, o de un producto dado de baja, da el mismo 404 que uno inexistente.
      if (!item) {
        throw itemNotFound();
      }
      if (dto.cantidad > item.producto.stock) {
        throw insufficientStock(item.producto.nombre);
      }

      await touchCart(tx, userId);
      await tx.itemCarrito.update({ where: { id: itemId }, data: { cantidad: dto.cantidad } });
    });

    return this.read(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    await this.prisma.serializable(async (tx) => {
      await touchCart(tx, userId);

      // Sin filtrar por producto: una línea oculta por una baja también se quita.
      const { count } = await tx.itemCarrito.deleteMany({
        where: { id: itemId, carrito: { usuario_id: userId } },
      });
      if (count === 0) {
        throw itemNotFound();
      }
    });

    return this.read(userId);
  }

  // Compra simulada: descuenta del stock lo que hay en el carrito y lo vacía,
  // todo o nada. No crea una orden ni cobra.
  async purchase(userId: string): Promise<PurchaseResponse> {
    const compra = await this.prisma.serializable(async (tx) => {
      await touchCart(tx, userId);
      const cart = await tx.carrito.findUniqueOrThrow({
        where: { usuario_id: userId },
        select: CART_SELECT,
      });

      if (cart.items.length === 0) {
        throw new BadRequestException('Tu carrito está vacío'); /* 400 */
      }

      // Se valida todo antes de descontar: si una línea no alcanza, no se toca ninguna.
      const short = cart.items.find((item) => item.cantidad > item.producto.stock);
      if (short) {
        throw insufficientStock(short.producto.nombre);
      }

      for (const item of cart.items) {
        await tx.producto.update({
          where: { id: item.producto.id },
          data: { stock: { decrement: item.cantidad } },
        });
      }

      // Sin filtrar por producto: también se van las líneas ocultas por una baja.
      await tx.itemCarrito.deleteMany({ where: { carrito_id: cart.id } });

      return toCart(cart);
    });

    return { compra, carrito: await this.read(userId) };
  }

  private async read(userId: string): Promise<CartResponse> {
    // findUniqueOrThrow si encuentra el registro, devuelve el objeto. Si no, 
    // lanza una excepción (PrismaClientKnownRequestError - P2025)
    const cart = await this.prisma.carrito.findUniqueOrThrow({
      where: { usuario_id: userId },
      select: CART_SELECT,
    });
    return toCart(cart);
  }
}

// Crea el carrito si falta y marca la actividad, que @updatedAt no ve en los
// ítems. Va primero en cada mutación: pone en fila las del mismo carrito.
function touchCart(tx: Prisma.TransactionClient, userId: string) {
  return tx.carrito.upsert({
    where: { usuario_id: userId },
    update: { actualizado_en: new Date() },
    create: { usuario_id: userId },
    select: { id: true },
  });
}

// Sin el número: el stock no se le muestra al cliente.
function insufficientStock(productName: string) {
  return new ConflictException(`No hay unidades suficientes de ${productName}`); /* 409 */
}

function itemNotFound() {
  return new NotFoundException('Ese producto ya no está en tu carrito'); /* 404 */
}
