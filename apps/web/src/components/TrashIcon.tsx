/** Tacho de Borrar, en la galería del panel. El tamaño lo pone quien lo usa, con `className`. */
export default function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path
        d="M2.5 4.5h11M6.25 4.5V2.75h3.5V4.5M3.75 4.5l.75 8.75h7l.75-8.75M6.75 7v3.75M9.25 7v3.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
