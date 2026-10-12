import { lowStockLabel } from '../lib/low-stock';

/**
 * Cartel "Últimas unidades" / "Última unidad" de la card y de la ficha. Sin nada que avisar, no se dibuja.
 * La misma forma que SoldOutBadge pero invertida (claro sobre oscuro): de la misma familia, y
 * distinto del gris de Sin stock a primera vista. Dónde va lo decide quien la usa, con `className`.
 */
export default function LowStockBadge({ stock, className = '' }: { stock: number; className?: string }) {
  const label = lowStockLabel(stock);
  if (!label) return null;

  return (
    // El borde y la sombra lo despegan de la foto, que también es clara.
    <span
      className={`rounded-full border border-scaps-page/15 bg-scaps-text px-2 py-0.5 text-[11px] font-medium tracking-wider text-scaps-page uppercase shadow-sm ${className}`}
    >
      {label}
    </span>
  );
}
