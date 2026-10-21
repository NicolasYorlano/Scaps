import { lowStockLabel } from '../lib/low-stock';
import FlameIcon from './FlameIcon';

/**
 * Cartel "Últimas unidades" / "Última unidad" de la card y de la ficha. Sin nada que avisar, no se dibuja.
 * La misma forma que SoldOutBadge, en el naranja de advertencia y con una llama: el gris de Sin stock dice
 * que no hay, y el naranja, que quedan pocas. Dónde va lo decide quien la usa, con `className`.
 */
export default function LowStockBadge({ stock, className = '', id }: { stock: number; className?: string; id?: string }) {
  const label = lowStockLabel(stock);
  if (!label) return null;

  return (
    // Oscuro: sobre la foto de la card, que es clara, se despega solo.
    // id: para que el enlace de la card o el botón de la ficha lo nombren (aria-describedby).
    // Debajo de 400 px, sin el espaciado de letras, y debajo de 360, sin la llama: así entra en un
    // renglón en la card más angosta.
    <span
      id={id}
      className={`inline-flex items-center gap-1 rounded-full border border-scaps-warning/60 bg-scaps-page px-2 py-0.5 text-[11px] font-medium tracking-wider whitespace-nowrap text-scaps-warning uppercase shadow-[0_1px_2px_rgb(0_0_0/0.25)] max-[400px]:gap-0.75 max-[400px]:px-1.5 max-[400px]:tracking-normal ${className}`}
    >
      <FlameIcon className="size-2.75 shrink-0 max-[360px]:hidden" />
      {label}
    </span>
  );
}
