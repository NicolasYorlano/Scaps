/** Llama del cartel de pocas unidades. Rellena: a 11 px, una de línea fina no se lee. El tamaño lo pone quien la usa, con `className`. */
export default function FlameIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`fill-current ${className}`}
    >
      <path d="M8.7 1c.3 2.4 3.8 4 3.8 8.2 0 3.3-2.1 5.8-4.5 5.8s-4.5-2.4-4.5-5.2c0-2 1-3.4 2.2-4.4-.1 1.6.4 2.7 1.4 3.2C7 5.8 7.5 3.3 8.7 1Z" />
    </svg>
  );
}
