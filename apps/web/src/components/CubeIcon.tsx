/** Cubo que anuncia el 3D, en el catálogo y en la ficha. El tamaño lo pone quien lo usa, con `className`. */
export default function CubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path d="M8 1.5l5.5 3.25v6.5L8 14.5l-5.5-3.25v-6.5L8 1.5zM2.5 4.75L8 8l5.5-3.25M8 8v6.5" strokeLinejoin="round" />
    </svg>
  );
}
