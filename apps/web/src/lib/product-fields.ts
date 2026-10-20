// Los campos de datos de un producto: los comparten el alta y la edición, que validan igual.
import { formatPriceInput, parsePriceInput } from './format-price';

// El tope del contrato.
const MAX_STOCK = 1_000_000;

/** Los ids de los campos, en el orden del formulario: la pantalla le pasa el foco al primero con error. */
export const PRODUCT_FIELD_IDS = {
  nombre: 'product-nombre',
  descripcion: 'product-descripcion',
  precio: 'product-precio',
  stock: 'product-stock',
} as const;

export type ProductField = keyof typeof PRODUCT_FIELD_IDS;

/** Lo que está escrito en cada campo, tal cual. */
export type ProductFieldsInput = Record<ProductField, string>;

/** Los valores en el formato del contrato. Sin descripción, null: el alta no la manda y la edición manda null. */
export type ProductFieldsValues = {
  nombre: string;
  descripcion: string | null;
  precio: string;
  stock: number;
};

export type ProductFieldsResult = {
  /** Los valores en el formato del contrato, o null si algún campo tiene error. */
  values: ProductFieldsValues | null;
  errors: Record<ProductField, string | null>;
  /** El id del primer campo con error, para focusField, o null si no hay ninguno. */
  firstInvalid: string | null;
};

/** Lo que muestran los campos al abrir la pantalla: vacíos en el alta, el producto en la edición. */
export function productFieldsInput(initial?: Partial<ProductFieldsValues>): ProductFieldsInput {
  return {
    nombre: initial?.nombre ?? '',
    descripcion: initial?.descripcion ?? '',
    precio: initial?.precio ? formatPriceInput(initial.precio) : '',
    stock: initial?.stock !== undefined ? String(initial.stock) : '',
  };
}

type StockResult = { value: number; error: null } | { value: null; error: string };

/** Un entero de 0 a 1.000.000. Los puntos, si los hay, separan miles como en el precio: 1.000 es mil y 1.0 es un error. */
function parseStockInput(input: string): StockResult {
  const clean = input.replace(/\s/g, '');
  if (clean === '') return { value: null, error: 'Ingresá el stock' };
  if (clean.startsWith('-')) return { value: null, error: 'El stock no puede ser negativo' };
  if (clean.includes(',')) return { value: null, error: 'El stock tiene que ser un número entero' };
  if (!/^\d+$/.test(clean) && !/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    return {
      value: null,
      error: /^[\d.]+$/.test(clean) ? 'Los puntos tienen que separar grupos de tres cifras' : 'Usá solo números',
    };
  }

  const stock = Number(clean.replace(/\./g, ''));
  if (stock > MAX_STOCK) return { value: null, error: 'El stock no puede superar 1.000.000' };
  return { value: stock, error: null };
}

/** Valida lo escrito: siempre se calcula, y la pantalla decide cuándo mostrar los errores. */
export function validateProductFields(input: ProductFieldsInput): ProductFieldsResult {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion.trim();
  const precio = parsePriceInput(input.precio);
  const stock = parseStockInput(input.stock);

  const errors = {
    nombre: nombre === '' ? 'Ingresá el nombre' : null,
    descripcion: null,
    precio: precio.error,
    stock: stock.error,
  };
  const invalid = (Object.keys(PRODUCT_FIELD_IDS) as ProductField[]).find((field) => errors[field] !== null);

  return {
    values:
      invalid === undefined && precio.value !== null && stock.value !== null
        ? { nombre, descripcion: descripcion === '' ? null : descripcion, precio: precio.value, stock: stock.value }
        : null,
    errors,
    firstInvalid: invalid ? PRODUCT_FIELD_IDS[invalid] : null,
  };
}
