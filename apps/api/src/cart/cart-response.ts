import { Prisma } from '@prisma/client';
import { toMoney } from '../common/money';
import { PUBLIC_WHERE } from '../products/product-filters';
import { CARD_SELECT, toProductCard, type ProductCardResponse } from '../products/product-response';

// Las líneas de un producto dado de baja no se traen. El orden es fijo: sin
// él, la línea que cambia de cantidad saltaría de lugar.
export const CART_SELECT = {
  id: true,
  actualizado_en: true,
  items: {
    where: { producto: PUBLIC_WHERE },
    orderBy: [{ producto: { nombre: 'asc' } }, { id: 'asc' }],
    select: {
      id: true,
      cantidad: true,
      producto: { select: CARD_SELECT },
    },
  },
} satisfies Prisma.CarritoSelect;

// Prisma.CarritoGetPayload: Es un tipo de utilidad proporcionado por Prisma. Su función es 
// calcular la "forma" (el objeto resultante o payload) de una consulta a la tabla Carrito.
type CartRow = Prisma.CarritoGetPayload<{ select: typeof CART_SELECT }>;
type CartProductRow = CartRow['items'][number]['producto'];

// La card del catálogo sin `destacado`, que el contrato no incluye acá.
export type CartProductResponse = Omit<ProductCardResponse, 'destacado'>;

export interface CartItemResponse {
  id: string;
  producto: CartProductResponse;
  cantidad: number;
  subtotal: string;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  total: string;
  actualizado_en: Date;
}

// El precio se lee del producto en cada respuesta. Las cuentas van en Decimal:
// ningún monto pasa por un float.
export function toCart(row: CartRow): CartResponse {
  let total = new Prisma.Decimal(0);

  const items = row.items.map((item): CartItemResponse => {
    const subtotal = item.producto.precio.mul(item.cantidad);
    total = total.add(subtotal);

    return {
      id: item.id,
      producto: toCartProduct(item.producto),
      cantidad: item.cantidad,
      subtotal: toMoney(subtotal),
    };
  });

  return {
    id: row.id,
    items,
    total: toMoney(total),
    actualizado_en: row.actualizado_en,
  };
}

function toCartProduct(row: CartProductRow): CartProductResponse {
  const card = toProductCard(row);

  return {
    id: card.id,
    nombre: card.nombre,
    slug: card.slug,
    precio: card.precio,
    imagen_principal: card.imagen_principal,
    stock: card.stock,
  };
}
