import { useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Checkbox from './Checkbox';
import { focusField, isTouchScreen } from '../lib/forms';
import {SEARCH_MAX_LENGTH, SORT_OPTIONS, cleanPrice, countPanelFilters, formatThousands, hasActiveFilters, isRangeInvalid, type CatalogFilters, type CatalogSort} from '../lib/catalog-filters';

const SEARCH_ID = 'catalog-search';
const SORT_ID = 'catalog-sort';
const TOGGLE_ID = 'catalog-filters-toggle';
const PANEL_ID = 'catalog-filters';
const PRICE_MIN_ID = 'catalog-price-min';
const PRICE_MAX_ID = 'catalog-price-max';
const RANGE_ERROR_ID = 'catalog-price-error';
const PENDING_ID = 'catalog-pending';

// 16 px en el celular: con menos, iOS acerca la página al enfocar el campo.
const fieldTextClassName = 'text-base md:text-sm';

// Caja con el rótulo adentro: el foco se dibuja en la caja, no en el control de adentro.
const boxClassName = `flex h-11 items-center rounded-scaps border bg-scaps-sunken ${fieldTextClassName} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-scaps-text`;

// Lo escrito y todavía sin aplicar. `base` recuerda de qué filtros salió:
// si la URL cambia (Atrás, Limpiar filtros), deja de valer y se ve lo aplicado.
type Draft = Pick<CatalogFilters, 'q' | 'priceMin' | 'priceMax' | 'inStock'> & {
  base: string;
};

function baseOf(values: Pick<CatalogFilters, 'q' | 'priceMin' | 'priceMax' | 'inStock'>): string {
  return JSON.stringify([values.q, values.priceMin, values.priceMax, values.inStock]);
}

/** Dónde queda el cursor en el precio con puntos, después de `digits` dígitos. */
function caretAfter(formatted: string, digits: number): number {
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (seen === digits) return i;
    if (formatted[i] !== '.') seen++;
  }
  return formatted.length;
}

type PriceFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
};

function PriceField({ id, label, value, onChange, invalid }: PriceFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Dígitos a la izquierda del cursor al escribir: los puntos se reacomodan y el cursor vuelve ahí.
  const caretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || caretDigits.current === null) return;
    const position = caretAfter(input.value, caretDigits.current);
    input.setSelectionRange(position, position);
    caretDigits.current = null;
  });

  return (
    <label
      htmlFor={id}
      className={`${boxClassName} gap-2 px-3.5 ${invalid ? 'border-scaps-error' : 'border-scaps-border-input'}`}
    >
      <span className="shrink-0 text-scaps-text-muted">{label}</span>
      <span aria-hidden="true" className="ml-auto text-scaps-text-muted">
        $
      </span>
      {/* type="text": un type="number" acepta signos y la "e", y trae flechitas. */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatThousands(value)}
        onChange={(e) => {
          const typed = e.target.value;
          const caret = e.target.selectionStart ?? typed.length;
          caretDigits.current = typed.slice(0, caret).replace(/\D/g, '').length;
          onChange(cleanPrice(typed));
        }}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? RANGE_ERROR_ID : undefined}
        className="w-24 min-w-0 bg-transparent text-scaps-text tabular-nums outline-none md:w-20 md:max-lg:w-18"
      />
    </label>
  );
}

type Props = {
  /** Lo aplicado: sale de la URL. */
  filters: CatalogFilters;
  onApply: (next: CatalogFilters, options?: { replace?: boolean }) => void;
  onClear: () => void;
  /** Lleva el foco al resumen de resultados, cuando el control usado desaparece. */
  onFocusResults: () => void;
  /** El título de la pantalla: comparte fila con el buscador. */
  children: ReactNode;
};

/** Buscador, orden y barra de filtros del catálogo. */
export default function CatalogToolbar({ filters, onApply, onClear, onFocusResults, children }: Props) {
  const base = baseOf(filters);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Solo importa en el celular: desde md la barra está siempre a la vista.
  const [open, setOpen] = useState(false);
  // Lo que dejó aplicado el último cambio de orden, mientras el foco siga en el select.
  const sortStreak = useRef<string | null>(null);

  const current: Draft =
    draft?.base === base
      ? draft
      : { base, q: filters.q, priceMin: filters.priceMin, priceMax: filters.priceMax, inStock: filters.inStock };

  // Derivado: se muestra recién al intentar aplicar y se va solo al corregir.
  const rangeInvalid = isRangeInvalid(current.priceMin, current.priceMax);
  const showRangeError = submitAttempted && rangeInvalid;
  const activeCount = countPanelFilters(filters);
  // Hay algo para limpiar: aplicado, o escrito y todavía sin aplicar.
  const canClear = hasActiveFilters(filters) || hasActiveFilters({ ...current, sort: filters.sort });
  // Lo que se ve en los controles no es lo que muestra la grilla.
  const dirty = baseOf({ ...current, q: current.q.trim() }) !== base;

  function update(patch: Partial<Draft>) {
    setDraft({ ...current, ...patch });
  }

  // Cualquier acción confirma todo lo que se ve en los controles.
  function apply(sort: CatalogSort, patch: Partial<Draft> = {}, replace = false) {
    const next = { ...current, ...patch };

    if (isRangeInvalid(next.priceMin, next.priceMax)) {
      setDraft(next);
      setSubmitAttempted(true);
      // El orden no depende del rango: se aplica igual.
      if (sort !== filters.sort) onApply({ ...filters, sort }, { replace });
      else focusField(PRICE_MIN_ID);
      return;
    }

    setDraft(null);
    setSubmitAttempted(false);
    setOpen(false); // en el celular deja ver los resultados
    onApply(
      { sort, q: next.q.trim(), priceMin: next.priceMin, priceMax: next.priceMax, inStock: next.inStock },
      { replace },
    );

    // La barra se pliega con el control que tenía el foco: vuelve al botón que la abre.
    if (open) focusField(TOGGLE_ID);
    // Soltar el campo cierra el teclado en pantalla.
    else if (isTouchScreen() && document.activeElement instanceof HTMLInputElement) document.activeElement.blur();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply(filters.sort);
  }

  // Varios cambios de orden seguidos (las flechas del teclado) son una sola entrada del historial.
  function changeSort(sort: CatalogSort) {
    const replace = sortStreak.current === `${base}|${filters.sort}`;
    const appliedBase = rangeInvalid ? base : baseOf({ ...current, q: current.q.trim() });
    apply(sort, {}, replace);
    sortStreak.current = `${appliedBase}|${sort}`;
  }

  function clearSearch() {
    apply(filters.sort, { q: '' });
    // El botón desaparece. En el celular el buscador abriría el teclado.
    if (isTouchScreen()) onFocusResults();
    else focusField(SEARCH_ID);
  }

  function clear() {
    setDraft(null);
    setSubmitAttempted(false);
    setOpen(false);
    onClear();
  }

  function togglePanel() {
    // Plegar sin aplicar descarta lo cargado en la barra.
    if (open) {
      update({ priceMin: filters.priceMin, priceMax: filters.priceMax, inStock: filters.inStock });
      setSubmitAttempted(false);
    }
    setOpen(!open);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        {children}

        {/* role="search" acá y no en el form: el título de la pantalla queda afuera. */}
        <div role="search" className="flex min-w-0 flex-col gap-3 md:flex-1 md:flex-row md:items-center md:justify-end">
          <div className="relative w-full min-w-0 md:max-w-92 md:flex-1">
            {/* Sin la "×" nativa: borraría el texto sin aplicar la búsqueda. */}
            <input
              id={SEARCH_ID}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Buscar en el catálogo"
              placeholder="Buscar gorras…"
              maxLength={SEARCH_MAX_LENGTH}
              value={current.q}
              onChange={(e) => update({ q: e.target.value })}
              className={`h-11 w-full min-w-0 rounded-scaps border border-scaps-border-input bg-scaps-sunken pl-3.5 ${current.q ? 'pr-11' : 'pr-3.5'} ${fieldTextClassName} text-scaps-text placeholder:text-scaps-text-muted [&::-webkit-search-cancel-button]:appearance-none`}
            />
            {/* La "×" propia borra y aplica. */}
            {current.q !== '' && (
              <button
                type="button"
                aria-label="Borrar la búsqueda"
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-scaps text-scaps-text-muted transition-colors hover:text-scaps-text"
              >
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-current stroke-[1.5]">
                  <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`${boxClassName} relative min-w-0 flex-1 border-scaps-border-input md:flex-none`}>
              <label
                htmlFor={SORT_ID}
                className="shrink-0 pl-3.5 whitespace-nowrap text-scaps-text-muted max-lg:sr-only"
              >
                Ordenar por
              </label>
              {/* Fondo opaco: con uno transparente, Chrome abre el desplegable en blanco y no se lee. */}
              <select
                id={SORT_ID}
                value={filters.sort}
                onChange={(e) => changeSort(e.target.value as CatalogSort)}
                onBlur={() => {
                  sortStreak.current = null;
                }}
                className="h-full min-w-0 flex-1 cursor-pointer appearance-none truncate rounded-scaps bg-scaps-sunken pr-8 pl-3.5 text-scaps-text outline-none md:pr-9 lg:pl-2"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                className="pointer-events-none absolute right-3.5 h-3 w-3 fill-none stroke-scaps-text-muted stroke-[1.5]"
              >
                <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <button
              id={TOGGLE_ID}
              type="button"
              aria-expanded={open}
              aria-controls={PANEL_ID}
              aria-label={
                activeCount > 0
                  ? `Filtros, ${activeCount} ${activeCount === 1 ? 'aplicado' : 'aplicados'}`
                  : undefined
              }
              onClick={togglePanel}
              className={`h-11 shrink-0 rounded-scaps border px-4 text-sm font-medium transition-colors hover:bg-scaps-card-highlight md:hidden ${activeCount > 0 ? 'border-scaps-border-primary text-scaps-text-on-primary' : 'border-scaps-border-input text-scaps-text-secondary'}`}
            >
              {activeCount > 0 ? `Filtros · ${activeCount}` : 'Filtros'}
            </button>
          </div>
        </div>
      </div>

      <div
        id={PANEL_ID}
        role="group"
        aria-label="Filtros"
        // Entre md y lg todo va más apretado: es lo que deja la barra en una sola fila.
        className={`${open ? 'flex' : 'hidden'} mt-3 flex-col gap-3 rounded-scaps border border-scaps-border bg-scaps-card p-3 md:mt-6 md:flex md:flex-row lg:mt-4 md:flex-wrap md:items-center md:px-4 md:max-lg:gap-2 md:max-lg:px-3`}
      >
        <span
          aria-hidden="true"
          className="hidden text-xs font-medium tracking-[0.06em] text-scaps-text-muted uppercase lg:block"
        >
          Filtros
        </span>
        <PriceField
          id={PRICE_MIN_ID}
          label="Precio mín."
          value={current.priceMin}
          onChange={(priceMin) => update({ priceMin })}
          invalid={showRangeError}
        />
        <PriceField
          id={PRICE_MAX_ID}
          label="Precio máx."
          value={current.priceMax}
          onChange={(priceMax) => update({ priceMax })}
          invalid={showRangeError}
        />
        {showRangeError && (
          // Mismo texto que devuelve el backend para este caso.
          <p
            id={RANGE_ERROR_ID}
            role="alert"
            className="text-xs font-medium text-scaps-error md:order-last md:basis-full"
          >
            El precio mínimo no puede ser mayor que el máximo
          </p>
        )}
        <label className={`flex h-11 cursor-pointer items-center gap-2 rounded-scaps border border-scaps-border-input px-3.5 ${fieldTextClassName} text-scaps-text-secondary`}>
          <Checkbox checked={current.inStock} onChange={(inStock) => update({ inStock })} />
          Con stock
        </label>
        <div className="flex items-center gap-3 md:ml-auto md:max-lg:gap-2">
          {canClear && (
            <button
              type="button"
              onClick={clear}
              className="h-12 shrink-0 px-2 text-sm text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary md:h-11"
            >
              Limpiar<span className="md:max-lg:sr-only"> filtros</span>
            </button>
          )}
          <button
            type="submit"
            aria-describedby={dirty ? PENDING_ID : undefined}
            // Con cambios sin aplicar se rellena: es lo que falta tocar.
            className={`h-12 flex-1 rounded-scaps border px-6 text-sm font-medium transition-colors md:h-11 md:flex-none md:max-lg:px-5 ${dirty ? 'border-scaps-text bg-scaps-text text-scaps-page hover:border-scaps-text-secondary hover:bg-scaps-text-secondary' : 'border-scaps-border-primary text-scaps-text-on-primary hover:bg-scaps-card-highlight'}`}
          >
            Aplicar
          </button>
          {dirty && (
            <span id={PENDING_ID} className="sr-only">
              Hay cambios sin aplicar
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
