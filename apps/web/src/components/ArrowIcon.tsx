/** Flecha de Subir y, con `down`, de Bajar, en la galería del panel. El tamaño lo pone quien lo usa, con `className`. */
export default function ArrowIcon({ className = '', down = false }: { className?: string; down?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${down ? 'rotate-180' : ''} ${className}`}
    >
      <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
