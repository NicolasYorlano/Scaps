import { useId, useState, type KeyboardEvent } from 'react';

type Props = {
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
};

// 44 px de alto (h-11): la medida de la guía, cómoda para el dedo.
// z-10 con el foco: el control de al lado no tapa el anillo.
const controlClassName =
  'relative h-11 border border-scaps-border-input bg-scaps-sunken text-scaps-text focus-visible:z-10 aria-disabled:cursor-not-allowed aria-disabled:text-scaps-text-annotation';

const buttonClassName = `${controlClassName} w-11 text-xl transition-colors hover:bg-scaps-card-highlight aria-disabled:hover:bg-scaps-sunken`;

/** Selector de cantidad para la ficha y el carrito. */
export default function QuantitySelector({ value, max, onChange, disabled = false, label = 'Cantidad' }: Props) {
  // Lo que se está escribiendo. Con null no se edita y se muestra el valor real.
  const [draft, setDraft] = useState<string | null>(null);
  const noticeId = useId();

  const overMax = value > max;
  const atMax = value === max;
  // aria-disabled, como SubmitButton: el control conserva el foco.
  // tabIndex -1: el Tab lo saltea igual.
  const minusDisabled = disabled || value <= 1;
  const plusDisabled = disabled || value >= max;

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    setDraft(null);
    if (disabled) return;

    // Vacío o con letras: vuelve al valor anterior.
    // Con signo sí pasa: -3 termina en 1.
    if (!/^-?\d+$/.test(text)) return;

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
    if (minusDisabled) return;
    onChange(overMax ? max : value - 1);
  }

  function add() {
    if (plusDisabled) return;
    onChange(value + 1);
  }

  return (
    // role="group": un lector de pantalla dice de qué producto es cada − y +.
    <div role="group" aria-label={label} className="inline-flex flex-col">
      <div className="isolate inline-flex">
        <button
          type="button"
          aria-label="Restar una unidad"
          aria-disabled={minusDisabled}
          tabIndex={minusDisabled ? -1 : undefined}
          onClick={subtract}
          className={`${buttonClassName} rounded-l-scaps`}
        >
          −
        </button>
        {/* 16 px en el celular: ver TextField. */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          aria-describedby={atMax ? noticeId : undefined}
          aria-disabled={disabled}
          readOnly={disabled}
          tabIndex={disabled ? -1 : undefined}
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={`${controlClassName} w-14 border-x-0 text-center text-base tabular-nums md:text-sm`}
        />
        <button
          type="button"
          aria-label="Sumar una unidad"
          aria-disabled={plusDisabled}
          tabIndex={plusDisabled ? -1 : undefined}
          onClick={add}
          className={`${buttonClassName} rounded-r-scaps`}
        >
          +
        </button>
      </div>

      {/* Solo al llegar al tope. Por encima del tope, la pantalla muestra su propio aviso. */}
      {/* Montado aunque esté vacío: así un lector de pantalla anuncia el texto. w-0 min-w-full: no ensancha. */}
      <p
        id={noticeId}
        role="status"
        className="w-0 min-w-full text-xs whitespace-nowrap text-scaps-text-muted not-empty:mt-1"
      >
        {atMax && 'No hay más unidades disponibles'}
      </p>
    </div>
  );
}
