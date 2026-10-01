type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Casilla "Mostrar contraseña" de los formularios de ingreso y de registro. */
export default function ShowPasswordToggle({ checked, onChange }: Props) {
  return (
    // El label entero es el control, con 44 px de alto para el dedo. El margen
    // negativo evita que ese alto separe la casilla de lo que viene abajo.
    <label className="-mb-3.5 flex w-fit cursor-pointer items-center gap-2 py-3.5 text-xs text-scaps-text-muted">
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        {/* El input es invisible: el foco del teclado se dibuja en la caja. */}
        <span className="pointer-events-none absolute inset-0 rounded-[3px] border border-scaps-border-input bg-scaps-sunken transition-colors peer-checked:border-scaps-border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-scaps-text" />
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 m-auto hidden h-2.5 w-2.5 fill-none stroke-scaps-text-on-primary stroke-2 peer-checked:block"
        >
          <path
            d="M2 6l2.5 2.5L10 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      Mostrar contraseña
    </label>
  );
}
