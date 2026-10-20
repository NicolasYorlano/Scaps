/** Lápiz de Editar, en el listado del panel. El tamaño lo pone quien lo usa, con `className`. */
export default function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path d="M11 2.5l2.5 2.5-8 8H3v-2.5l8-8zM9.5 4l2.5 2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
