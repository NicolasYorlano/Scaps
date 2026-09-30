// Regla: el frontend nunca hace cuentas con plata; los totales los calcula el backend.

const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  trailingZeroDisplay: 'stripIfInteger', // centavos solo si no son cero
});

/**
 * "15999.00" → "$ 15.999" · "15999.50" → "$ 15.999,50".
 * Ojo: el espacio después del "$" es U+00A0 (no separable), no uno común.
 */
export function formatPrice(amount: string): string {
  return ars.format(Number(amount));
}
