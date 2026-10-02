import { useApiQuery } from '../hooks/useApi';

// Diagnóstico: comprueba que el front llega a la API (URL,
// CORS y prefijo /api). No está enlazada en el navbar; se entra escribiendo
// /health, igual que se consulta el endpoint que consume.

type HealthResponse = { status: string };

export default function Health() {
  const { data, loading, error, reload } = useApiQuery<HealthResponse>('/health');

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-scaps-canvas px-6 text-center">
      <h1 className="font-display text-heading text-scaps-text">
        Estado de la API
      </h1>
      <p className="font-mono text-xs text-scaps-text-muted">
        GET {import.meta.env.VITE_API_URL}/health
      </p>

      {loading && <p className="text-scaps-text-secondary">Consultando…</p>}

      {error && (
        <>
          <p className="max-w-md text-scaps-text">{error.message}</p>
          {!error.isNetworkError && (
            <p className="text-xs text-scaps-text-muted">HTTP {error.status}</p>
          )}
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-scaps-border-input px-4 py-2 text-sm text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:text-scaps-text"
          >
            Reintentar
          </button>
        </>
      )}

      {data && <p className="text-scaps-text">status: {data.status}</p>}
    </main>
  );
}
