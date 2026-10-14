/** Círculo con exclamación de los avisos: lo que falló o hay que corregir. El tamaño lo pone quien lo usa, con `className`. */
export default function AlertIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.75v4M8 11.25v.01" strokeLinecap="round" />
    </svg>
  );
}
