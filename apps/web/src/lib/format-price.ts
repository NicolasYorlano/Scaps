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

/**
 * Pasa un valor del campo de texto al formato del contrato (string numérico tipo "15999.50").
 * Devuelve un objeto con el valor parseado o el mensaje de error correspondiente.
 */
export function parsePriceInput(input: string): { value?: string; error?: string } {
  // Limpiar espacios y símbolo $const clean = input.replace(/[\s$]/g, '');
  if (clean === '') {
    return { error: 'Ingresá un precio' };
  }

  // Verificar si hay letras u otros símbolos inválidos (solo números, un punto o una coma)
  if (!/^[\d.,]+$/.test(clean)) {
    return { error: 'El precio contiene caracteres no válidos' };
  }

  // Contar comas y puntos
  const commaCount = (clean.match(/,/g) || []).length;
  const dotCount = (clean.match(/\./g) || []).length;

  if (commaCount > 1) {
    return { error: 'El precio no puede tener más de una coma' };
  }
  if (dotCount > 3) {
    return { error: 'Formato de precio inválido' };
  }

  // Si usa punto para los centavos por error (ej: 15.99)
  if (commaCount === 0 && dotCount === 1) {
    const parts = clean.split('.');
    if (parts[1] && parts[1].length === 2 && parts[0].length <= 2) {
      return { error: 'Para los centavos usá coma: 15,99' };
    }
  }

  // Validar separadores de miles con puntos y decimal con coma
  // Normalizamos para chequear estructura: reemplazamos puntos de miles por nada y coma por punto
  let normalized = clean;
  if (commaCount === 1) {
    const [integerPart, decimalPart] = clean.split(',');
    if (decimalPart.length > 2) {
      return { error: 'El precio admite hasta dos decimales' };
    }
    if (dotCount > 0) {
      // Validar que los puntos separen grupos de 3 cifras en la parte entera
      const intParts = integerPart.split('.');
      if (intParts[0].length > 3 || intParts.slice(1).some(p => p.length !== 3)) {
        return { error: 'Los puntos deben separar grupos de tres cifras' };
      }
    }
    normalized = integerPart.replace(/\./g, '') + '.' + decimalPart;
  } else {
    // Sin coma, solo puntos de miles opcionales
    if (dotCount > 0) {
      const intParts = clean.split('.');
      if (intParts[0].length > 3 || intParts.slice(1).some(p => p.length !== 3)) {
        return { error: 'Los puntos deben separar grupos de tres cifras' };
      }
    }
    normalized = clean.replace(/\./g, '');
  }

  // Convertir a validación de rango como string sin perder precisión
  // Mayor que cero y hasta 99999999.99
  const numValue = Number(normalized);
  if (isNaN(numValue) || numValue <= 0) {
    return { error: 'El precio debe ser mayor a cero' };
  }
  if (numValue > 99999999.99) {
    return { error: 'El precio máximo es 99.999.999,99' };
  }

  // Asegurar formato de dos decimales para el contrato si es entero o decimal
  const [intStr, decStr = ''] = normalized.split('.');
  const paddedDec = decStr.padEnd(2, '0');
  return { value: `${intStr}.${paddedDec}` };
}

/**
 * Hace el camino inverso para precargar la edición: "15999.00" → "15.999", "15999.50" → "15.999,50".
 */
export function formatPriceInput(amount?: string | null): string {
  if (!amount) return '';
  const [integerPart, decimalPart] = amount.split('.');
  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!decimalPart || decimalPart === '00') {
    return formattedInt;
  }
  return `${formattedInt},${decimalPart.replace(/0+$/, '')}`;
}
