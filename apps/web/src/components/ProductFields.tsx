import TextField from './TextField';
import {
  PRODUCT_FIELD_IDS,
  validateProductFields,
  type ProductField,
  type ProductFieldsInput,
} from '../lib/product-fields';

type Props = {
  /** Lo escrito en cada campo. La pantalla lo arranca con productFieldsInput (vacío, o con el producto en la edición). */
  value: ProductFieldsInput;
  onChange: (value: ProductFieldsInput) => void;
  /** La pantalla ya intentó guardar: desde ahí se ven los errores, y se van solos al corregir el campo. */
  submitAttempted: boolean;
};

/**
 * Nombre, descripción, precio y stock, con sus validaciones. No llama a la API: la pantalla
 * usa validateProductFields para obtener los valores en el formato del contrato y el primer campo con error.
 */
export default function ProductFields({ value, onChange, submitAttempted }: Props) {
  const shown = submitAttempted ? validateProductFields(value).errors : null;

  function update(field: ProductField) {
    return (text: string) => onChange({ ...value, [field]: text });
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        id={PRODUCT_FIELD_IDS.nombre}
        label="Nombre"
        autoComplete="off"
        value={value.nombre}
        onChange={update('nombre')}
        error={shown?.nombre}
      />

      {/* TextField solo arma un <input>: la descripción es un <textarea> con las mismas clases. */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={PRODUCT_FIELD_IDS.descripcion}
          className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
        >
          Descripción
        </label>
        <textarea
          id={PRODUCT_FIELD_IDS.descripcion}
          name={PRODUCT_FIELD_IDS.descripcion}
          rows={4}
          value={value.descripcion}
          onChange={(e) => update('descripcion')(e.target.value)}
          className="rounded-scaps border border-scaps-border-input bg-scaps-sunken px-3.5 py-2.5 text-base text-scaps-text md:text-sm"
        />
      </div>

      <TextField
        id={PRODUCT_FIELD_IDS.precio}
        label="Precio"
        inputMode="decimal"
        autoComplete="off"
        value={value.precio}
        onChange={update('precio')}
        error={shown?.precio}
      />

      <TextField
        id={PRODUCT_FIELD_IDS.stock}
        label="Stock"
        inputMode="numeric"
        autoComplete="off"
        value={value.stock}
        onChange={update('stock')}
        error={shown?.stock}
      />
    </div>
  );
}
