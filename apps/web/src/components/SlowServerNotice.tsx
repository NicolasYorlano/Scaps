import { useRequestStore } from '../stores/request-store';

// Se monta una sola vez en App y cubre toda la app: cualquier llamada que pase
// de 5 segundos lo muestra.

export default function SlowServerNotice() {
  const isSlow = useRequestStore((state) => state.isSlow);

  if (!isSlow) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-scaps-border-input bg-scaps-card-highlight px-4 py-2 text-center text-sm text-scaps-text"
    >
      La conexión está tardando más de lo esperado... Puede que se esté despertando el servidor, esto puede tardar un minuto...
    </div>
  );
}
