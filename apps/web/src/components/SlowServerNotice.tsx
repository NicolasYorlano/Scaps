import { useRequestStore } from '../stores/request-store';

// Se monta una sola vez en App y cubre toda la app: cualquier llamada que pase
// de 5 segundos lo muestra.

export default function SlowServerNotice() {
  const isSlow = useRequestStore((state) => state.isSlow);

  if (!isSlow) return null;

  return (
    // inset-x + mx-auto + w-fit y no left-1/2, que lo limita a media pantalla.
    // pointer-events-none: deja pasar los clics a lo que queda debajo.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto w-fit max-w-xl rounded-scaps border border-scaps-border-input bg-scaps-card-highlight px-4 py-3 text-center text-sm text-scaps-text"
    >
      La conexión está tardando más de lo esperado... Puede que se esté
      despertando el servidor, esto puede tardar un minuto...
    </div>
  );
}
