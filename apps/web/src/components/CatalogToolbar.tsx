import { useState, type FormEvent, type ReactNode } from 'react';
import Checkbox from './Checkbox';
import { focusField } from '../lib/forms';
import {SEARCH_MAX_LENGTH, SORT_OPTIONS, cleanPrice, countPanelFilters, hasActiveFilters, isRangeInvalid, type CatalogFilters, type CatalogSort} from '../lib/catalog-filters';

const SEARCH_ID = 'catalog-search';
const SORT_ID = 'catalog-sort';
const PANEL_ID = 'catalog-filters';
const PRICE_MIN_ID = 'catalog-price-min';
const PRICE_MAX_ID = 'catalog-price-max';
const RANGE_ERROR_ID = 'catalog-price-error';

// Caja con el rótulo adentro: el foco se dibuja en la caja, no en el control de adentro.
const boxClassName =
  'flex h-11 items-center rounded-scaps border bg-scaps-sunken text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-scaps-text';

// Lo escrito y todavía sin aplicar. `base` recuerda de qué filtros salió:
// si la URL cambia (Atrás, Limpiar filtros), deja de valer y se ve lo aplicado.
type Draft = Pick<CatalogFilters, 'q' | 'priceMin' | 'priceMax' | 'inStock'> & {
  base: string;
};

type PriceFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
};

function PriceField({ id, label, value, onChange, invalid }: PriceFieldProps) {
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
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(cleanPrice(e.target.value))}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? RANGE_ERROR_ID : undefined}
        className="w-20 min-w-0 bg-transparent text-scaps-text tabular-nums outline-none md:max-lg:w-18"
      />
    </label>
  );
}

type Props = {
  /** Lo aplicado: sale de la URL. */
  filters: CatalogFilters;
  onApply: (next: CatalogFilters) => void;
  onClear: () => void;
  /** El título de la pantalla: comparte fila con el buscador. */
  children: ReactNode;
};

/** Buscador, orden y barra de filtros del catálogo. */
export default function CatalogToolbar({ filters, onApply, onClear, children }: Props) {
  const base = JSON.stringify([filters.q, filters.priceMin, filters.priceMax, filters.inStock]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Solo importa en el celular: desde md la barra está siempre a la vista.
  const [open, setOpen] = useState(false);

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

  function update(patch: Partial<Draft>) {
    setDraft({ ...current, ...patch });
  }

  // Cualquier acción confirma todo lo que se ve en los controles.
  function apply(sort: CatalogSort) {
    if (rangeInvalid) {
      setSubmitAttempted(true);
      // El orden no depende del rango: se aplica igual.
      if (sort !== filters.sort) onApply({ ...filters, sort });
      else focusField(PRICE_MIN_ID);
      return;
    }

    setDraft(null);
    setSubmitAttempted(false);
    setOpen(false); // en el celular deja ver los resultados
    onApply({
      sort,
      q: current.q.trim(),
      priceMin: current.priceMin,
      priceMax: current.priceMax,
      inStock: current.inStock,
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply(filters.sort);
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
    <form role="search" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        {children}

        <div className="flex min-w-0 flex-col gap-3 md:flex-1 md:flex-row md:items-center md:justify-end">
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
            className="h-11 w-full min-w-0 rounded-scaps border border-scaps-border-input bg-scaps-sunken px-3.5 text-sm text-scaps-text placeholder:text-scaps-text-muted md:max-w-92 md:flex-1 [&::-webkit-search-cancel-button]:appearance-none"
          />

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
                onChange={(e) => apply(e.target.value as CatalogSort)}
                className="h-full min-w-0 flex-1 cursor-pointer appearance-none rounded-scaps bg-scaps-sunken pr-9 pl-3.5 text-scaps-text outline-none lg:pl-2"
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
              type="button"
              aria-expanded={open}
              aria-controls={PANEL_ID}
              aria-label={
                activeCount > 0
                  ? `Filtros, ${activeCount} ${activeCount === 1 ? 'aplicado' : 'aplicados'}`
                  : undefined
              }
              onClick={togglePanel}
              className={`h-12 shrink-0 rounded-scaps border px-5 text-sm font-medium transition-colors hover:bg-scaps-card-highlight md:hidden ${activeCount > 0 ? 'border-scaps-border-primary text-scaps-text-on-primary' : 'border-scaps-border-input text-scaps-text-secondary'}`}
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
        className={`${open ? 'flex' : 'hidden'} mt-3 flex-col gap-3 rounded-scaps border border-scaps-border bg-scaps-card p-3 md:mt-6 md:flex md:flex-row md:flex-wrap md:items-center md:px-4 md:max-lg:gap-2 md:max-lg:px-3`}
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
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-scaps border border-scaps-border-input px-3.5 text-sm text-scaps-text-secondary">
          <Checkbox checked={current.inStock} onChange={(inStock) => update({ inStock })} />
          Con stock
        </label>
        <div className="flex items-center gap-3 md:ml-auto md:max-lg:gap-2">
          {canClear && (
            <button
              type="button"
              onClick={clear}
              className="h-12 shrink-0 px-2 text-sm text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
            >
              Limpiar<span className="md:max-lg:sr-only"> filtros</span>
            </button>
          )}
          <button
            type="submit"
            className="h-12 flex-1 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight md:flex-none md:max-lg:px-5"
          >
            Aplicar
          </button>
        </div>
      </div>
    </form>
  );
}
