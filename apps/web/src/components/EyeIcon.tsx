/**
 * Ojo del listado del panel: abierto para Reactivar (vuelve a verse en el catálogo) y tachado, con `off`,
 * para Dar de baja (deja de verse). El tamaño lo pone quien lo usa, con `className`.
 */
export default function EyeIcon({ className = '', off = false }: { className?: string; off?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5 6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" />
      {off && <path d="M2.5 2.5l11 11" strokeLinecap="round" />}
    </svg>
  );
}
