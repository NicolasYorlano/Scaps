/** Etiqueta "Sin stock" de la card y de la ficha. Dónde va lo decide quien la usa, con `className`. */
export default function SoldOutBadge({ className = '', id }: { className?: string; id?: string }) {
  return (
    // id: para que un botón deshabilitado lo nombre como motivo (aria-describedby).
    <span
      id={id}
      className={`rounded-full border border-scaps-border-input bg-scaps-canvas px-2 py-0.5 text-[11px] font-medium tracking-wider text-scaps-text-secondary uppercase ${className}`}
    >
      Sin stock
    </span>
  );
}
