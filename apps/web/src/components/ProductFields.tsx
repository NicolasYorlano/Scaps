import { useState } from 'react';
import TextField from './TextField';
import { parsePriceInput, formatPriceInput } from '../lib/format-price';

export interface ProductFieldsValues {
  nombre: string;
  descripcion: string | null;
  precio: string; // formato contrato, ej: "15999.50"
  stock: string;  // string numérico entero
}

interface ProductFieldsProps {
  initialValues?: Partial<ProductFieldsValues>;
  submitAttempted: boolean;
  onValidChange?: (values: ProductFieldsValues, isValid: boolean) => void;
}

const MAX_STOCK = 1000000;

export const PRODUCT_FIELDS_ORDER = ['nombre', 'descripcion', 'precio', 'stock'] as const;

export function validateProductFields(values: { nombre: string; descripcion: string; precioInput: string; stockInput: string }) {
  const trimmedName = values.nombre.trim();
  const nombreError = trimmedName === '' ? 'Ingresá el nombre del producto' : null;

  const priceResult = parsePriceInput(values.precioInput);
  const precioError = priceResult.error ?? null;

  let stockError: string | null = null;
  const trimmedStock = values.stockInput.trim();
  if (trimmedStock === '') {
    stockError = 'Ingresá el stock';
  } else if (!/^\d+$/.test(trimmedStock)) {
    stockError = 'El stock debe ser un número entero';
  } else {
    const stockNum = Number(trimmedStock);
    if (stockNum < 0 || stockNum > MAX_STOCK) {
      stockError = `El stock debe estar entre 0 y ${MAX_STOCK.toLocaleString('es-AR')}`;
    }
  }

  return {
    errors: {
      nombre: nombreError,
      descripcion: null, // opcional
      precio: precioError,
      stock: stockError,
    },
    values: {
      nombre: trimmedName,
      descripcion: values.descripcion.trim() === '' ? null : values.descripcion,
      precio: priceResult.value ?? '',
      stock: trimmedStock,
    },
    isValid: !nombreError && !precioError && !stockError,
  };
}

export default function ProductFields({ initialValues, submitAttempted }: ProductFieldsProps) {
  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(initialValues?.descripcion ?? '');
  const [precioInput, setPrecioInput] = useState(formatPriceInput(initialValues?.precio));
  const [stockInput, setStockInput] = useState(initialValues?.stock ?? '');

  const validation = validateProductFields({ nombre, descripcion, precioInput, stockInput });
  const shown = submitAttempted ? validation.errors : null;

  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="nombre"
        label="Nombre"
        required
        autoComplete="off"
        value={nombre}
        onChange={setNombre}
        error={shown?.nombre}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="descripcion"
          className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
        >
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="rounded-scaps border border-scaps-border-input bg-scaps-sunken px-3.5 py-2.5 text-base text-scaps-text md:text-sm focus:outline-none focus:ring-1 focus:ring-scaps-text"
        />
      </div>

      <TextField
        id="precio"
        label="Precio"
        required
        inputMode="decimal"
        autoComplete="off"
        value={precioInput}
        onChange={setPrecioInput}
        error={shown?.precio}
        hint="Ej: 15.999,50"
      />

      <TextField
        id="stock"
        label="Stock"
        required
        inputMode="numeric"
        autoComplete="off"
        value={stockInput}
        onChange={setStockInput}
        error={shown?.stock}
        hint="Número entero (hasta 1.000.000)"
      />
    </div>
  );
}
