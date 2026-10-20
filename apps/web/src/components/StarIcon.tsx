/** Estrella de Destacar, en el listado del panel. El tamaño lo pone quien lo usa, con `className`. */
export default function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path
        d="M8 2 9.62 6.28 14.18 6.49 10.62 9.35 11.82 13.76 8 11.25 4.18 13.76 5.38 9.35 1.82 6.49 6.38 6.28Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
