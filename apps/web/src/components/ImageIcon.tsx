/** Foto de Hacer portada y del lugar de la imagen nueva, en la galería del panel. El tamaño lo pone quien lo usa, con `className`. */
export default function ImageIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="5.75" cy="6.5" r="1.25" />
      <path d="M2.5 12l3.75-3.75 2.75 2.75 1.75-1.75L13.5 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
