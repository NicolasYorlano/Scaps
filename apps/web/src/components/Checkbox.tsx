type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Caja de una casilla, sin texto: va dentro del <label> de quien la usa. */
export default function Checkbox({ checked, onChange }: Props) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      {/* El input es invisible: el foco del teclado se dibuja en la caja. */}
      <span className="pointer-events-none absolute inset-0 rounded-[3px] border border-scaps-border-input bg-scaps-sunken transition-colors peer-checked:border-scaps-text peer-checked:bg-scaps-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-scaps-text" />
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute inset-0 m-auto hidden h-2.5 w-2.5 fill-none stroke-scaps-page stroke-2 peer-checked:block"
      >
        <path
          d="M2 6l2.5 2.5L10 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
