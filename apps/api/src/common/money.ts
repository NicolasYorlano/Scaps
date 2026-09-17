import type { Prisma } from '@prisma/client';

// Decimal pierde los ceros finales al serializar ("24999.00" sale "24999"), y
// el contrato pide los montos como string con dos decimales.
export function toMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
