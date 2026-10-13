import type { ReactNode } from 'react';

/**
 * Aviso corto con un ícono de exclamación adelante: un error, o algo que hay que corregir para poder seguir.
 * Lo usan las líneas del carrito y el bloque de compra. El sistema es monocromo: lo distingue el ícono, no un color.
 * Con `alert` (los errores), un lector de pantalla lo anuncia apenas aparece.
 */
export default function LineNotice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <p role={alert ? 'alert' : undefined} className="flex gap-2 text-sm text-scaps-text">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="mt-0.5 h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.25]"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.75v4M8 11.25v.01" strokeLinecap="round" />
      </svg>
      {/* wrap-break-word: un nombre de producto de una sola palabra larga se corta en vez de desbordar. */}
      <span className="min-w-0 wrap-break-word">{children}</span>
    </p>
  );
}
