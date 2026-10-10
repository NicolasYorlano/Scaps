import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserResponse } from '../auth/user-response';
import type { CartResponse } from './cart-response';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

// Mismo cuidado que con los ids de las rutas de productos.
const ItemId = () =>
  Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('El id del ítem no es válido') }));

// Todas piden sesión: el carrito es siempre el del usuario del token.
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  find(@CurrentUser() user: UserResponse): Promise<CartResponse> {
    return this.cart.find(user.id);
  }

  // 200 y no el 201 que Nest le pone a todo POST: devuelve el carrito, como el GET.
  @Post('items')
  @HttpCode(HttpStatus.OK)
  addItem(@CurrentUser() user: UserResponse, @Body() dto: AddCartItemDto): Promise<CartResponse> {
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:id')
  updateItem(@CurrentUser() user: UserResponse, @ItemId() id: string, @Body() dto: UpdateCartItemDto): Promise<CartResponse> {
    return this.cart.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: UserResponse, @ItemId() id: string): Promise<CartResponse> {
    return this.cart.removeItem(user.id, id);
  }
}
