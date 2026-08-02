import { useApiQuery } from '../hooks/useApi';

// Diagnóstico: comprueba que el front llega a la API (URL,
// CORS y prefijo /api). No está enlazada en el navbar; se entra escribiendo
// /health, igual que se consulta el endpoint que consume.

type HealthResponse = { status: string };

export default function Health() {
  const { data, loading, error, reload } = useApiQuery<HealthResponse>('/health');

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
      <h1 className="text-3xl font-semibold text-slate-50">Estado de la API</h1>
      <p className="font-mono text-xs text-slate-500">
        GET {import.meta.env.VITE_API_URL}/health
      </p>

      {loading && <p className="text-slate-300">Consultando…</p>}

      {error && (
        <>
          <p className="max-w-md text-rose-300">{error.message}</p>
          {!error.isNetworkError && (
            <p className="text-xs text-slate-500">HTTP {error.status}</p>
          )}
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-emerald-400 hover:text-emerald-400"
          >
            Reintentar
          </button>
        </>
      )}

      {data && <p className="text-emerald-400">status: {data.status}</p>}
    </main>
  );
}
