import type { Prisma } from '@prisma/client';

// Monto sin signo, con punto decimal y hasta dos decimales, que entre en
// Decimal(10,2): más de 8 enteros desborda la columna y Prisma responde 500.
// Se valida como string para que nunca pase por un float.
export const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

// Decimal pierde los ceros finales al serializar ("24999.00" sale "24999"), y
// el contrato pide los montos como string con dos decimales.
export function toMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
