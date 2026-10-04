/** Etiqueta "Sin stock" de la card y de la ficha. Dónde va lo decide quien la usa, con `className`. */
export default function SoldOutBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`rounded-full border border-scaps-border-input bg-scaps-canvas px-2 py-0.5 text-[11px] font-medium tracking-wider text-scaps-text-secondary uppercase ${className}`}
    >
      Sin stock
    </span>
  );
}
