import { lowStockLabel } from '../lib/low-stock';

/**
 * Cartel "Últimas unidades" / "Última unidad" de la card y de la ficha. Sin nada que avisar, no se dibuja.
 * La misma forma que SoldOutBadge pero invertida (letra oscura sobre fondo claro): de la misma familia, y
 * distinto del gris de Sin stock a primera vista. Dónde va lo decide quien la usa, con `className`.
 */
export default function LowStockBadge({ stock, className = '', id }: { stock: number; className?: string; id?: string }) {
  const label = lowStockLabel(stock);
  if (!label) return null;

  return (
    // El borde y la sombra lo despegan de la foto, que también es clara.
    // id: para que el enlace de la card o el botón de la ficha lo nombren (aria-describedby).
    // Debajo de 360 px, sin el espaciado de letras: así entra en un renglón en la card más angosta.
    <span
      id={id}
      className={`rounded-full border border-scaps-page/15 bg-scaps-text px-2 py-0.5 text-[11px] font-medium tracking-wider whitespace-nowrap text-scaps-page uppercase shadow-sm max-[360px]:px-1.5 max-[360px]:tracking-normal ${className}`}
    >
      {label}
    </span>
  );
}
