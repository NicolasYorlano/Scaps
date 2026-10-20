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

// El tope del contrato, 99999999.99: hasta ocho cifras enteras.
const MAX_PRICE_DIGITS = 8;

export type PriceInputResult = { value: string; error: null } | { value: null; error: string };

function priceError(error: string): PriceInputResult {
  return { value: null, error };
}

/**
 * Del campo al string del contrato, como se escribe en Argentina: el punto separa
 * los miles y la coma, los centavos. "15.999" → "15999.00" · "15999,5" → "15999.50".
 * De texto a texto, sin pasar por número: parseFloat y toFixed redondean.
 */
export function parsePriceInput(input: string): PriceInputResult {
  // El $ y los espacios se descartan (\s también cubre el no separable de formatPrice).
  const clean = input.replace(/[\s$]/g, '');
  if (clean === '') return priceError('Ingresá el precio');
  if (clean.startsWith('-')) return priceError('El precio tiene que ser mayor que cero');

  const match = /^(\d+(?:\.\d+)*)(?:,(\d+))?$/.exec(clean);
  if (!match) return priceError('Usá solo números, con punto para los miles y coma para los centavos');
  const [, integer, decimals = ''] = match;

  const groups = integer.split('.');
  const validThousands = groups.slice(1).every((group) => group.length === 3) && groups[0].length <= 3;
  if (groups.length > 1 && !validThousands) {
    // Un solo punto con una o dos cifras detrás: es un precio escrito a la inglesa.
    const english = groups.length === 2 && decimals === '' && groups[1].length <= 2;
    return priceError(english ? 'Para los centavos usá coma: 15,99' : 'Los puntos tienen que separar grupos de tres cifras');
  }
  if (decimals.length > 2) return priceError('Usá hasta dos decimales');

  const digits = groups.join('').replace(/^0+(?=\d)/, '');
  const cents = decimals.padEnd(2, '0');
  if (digits === '0' && cents === '00') return priceError('El precio tiene que ser mayor que cero');
  if (digits.length > MAX_PRICE_DIGITS) return priceError('El precio no puede superar los $ 99.999.999,99');

  return { value: `${digits}.${cents}`, error: null };
}

/**
 * El camino inverso, para precargar la edición: lo mismo que formatPrice, sin el $.
 * "15999.00" → "15.999" · "15999.50" → "15.999,50".
 */
export function formatPriceInput(amount: string): string {
  const [integer, cents = '00'] = amount.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+$)/g, '.');
  return cents === '00' ? grouped : `${grouped},${cents}`;
}
