import { useState, type KeyboardEvent } from 'react';

interface QuantitySelectorProps {
  /** Cantidad actual. Se muestra tal cual, aunque supere el tope. */
  value: number;
  /** Tope de unidades (stock). 1 o más: con 0 cada pantalla tiene su propio estado. */
  max: number;
  /** Se llama con la cantidad nueva, ya validada. Un solo cambio por acción. */
  onChange: (value: number) => void;
  /** Deshabilita todo, por ejemplo mientras hay un pedido en curso. */
  disabled?: boolean;
  /** Etiqueta del campo para lectores de pantalla. */
  label?: string;
}

// 44 px de alto (h-11): la medida de la guía, cómoda para el dedo.
const CONTROL =
  'h-11 border border-slate-600 bg-slate-900 text-slate-50 hover:bg-slate-800 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-900';

export default function QuantitySelector({
  value,
  max,
  onChange,
  disabled = false,
  label = 'Cantidad',
}: QuantitySelectorProps) {
  // Lo que se está escribiendo. Con null no se edita y se muestra el valor real.
  const [draft, setDraft] = useState<string | null>(null);

  const overMax = value > max;
  const atMax = value === max;

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    setDraft(null);

    // Vacío o con letras: vuelve al valor anterior.
    if (!/^\d+$/.test(text)) return;

    const next = Math.min(Math.max(Number(text), 1), max);
    if (next !== value) onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    commit();
  }

  // Por encima del tope baja directo al tope: restar de a uno no sirve, la API rechaza con 409.
  function subtract() {
    onChange(overMax ? max : value - 1);
  }

  return (
    <div className="inline-flex flex-col">
      <div className="inline-flex">
        <button
          type="button"
          aria-label="Restar una unidad"
          disabled={disabled || value <= 1}
          onClick={subtract}
          className={`${CONTROL} w-11 rounded-l-md text-xl`}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          value={draft ?? String(value)}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={`${CONTROL} w-14 border-x-0 text-center tabular-nums`}
        />
        <button
          type="button"
          aria-label="Sumar una unidad"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className={`${CONTROL} w-11 rounded-r-md text-xl`}
        >
          +
        </button>
      </div>

      {/* Solo al llegar al tope. Por encima del tope, la pantalla muestra su propio aviso. */}
      {atMax && (
        <p role="status" className="mt-1 text-xs text-slate-300">
          No hay más unidades disponibles
        </p>
      )}
    </div>
  );
}
