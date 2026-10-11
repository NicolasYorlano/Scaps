/** Carrito del navbar, de la misma familia que el cubo del 3D. El tamaño lo pone quien lo usa, con `className`. */
export default function CartIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-none stroke-current stroke-[1.25] ${className}`}
    >
      <path d="M1 2h2l1.6 8.5h8l1.6-6.5H3.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="6" cy="13.5" r="1" />
      <circle cx="11.5" cy="13.5" r="1" />
    </svg>
  );
}
