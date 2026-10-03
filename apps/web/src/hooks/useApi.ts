import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';

// lib/api.ts sabe hablar con el backend, pero no sabe nada de React: devuelve
// una promesa y listo. La pantalla necesita otra cosa — saber si la llamada
// está en curso (para el spinner) y si falló (para el mensaje de error).
//
// Estos hooks son ese puente. Sin ellos, cada pantalla repetiría los mismos
// useState y el mismo try/catch. Son dos porque hay dos momentos distintos en
// los que se llama a la API:
//
//   useApiQuery  → al abrir la pantalla (leer)
//   useApiAction → cuando el usuario hace algo (mutaciones)

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, ['Ocurrió un error inesperado.']);
}

type Result<T> = {
  /** A qué llamada pertenece este resultado. */
  key: string;
  data: T | null;
  error: ApiError | null;
};

// Última respuesta buena de las rutas que la piden con `keep`: al volver a la
// pantalla se ve al instante, mientras se pide de nuevo. Solo para datos
// públicos: dura lo que la pestaña y no distingue sesiones.
const KEPT_MAX = 20;
const kept = new Map<string, unknown>();

function keepResponse(path: string, data: unknown) {
  kept.delete(path); // vuelve a entrar al final: la más vieja sale primero
  kept.set(path, data);
  const oldest = kept.keys().next().value;
  if (kept.size > KEPT_MAX && oldest !== undefined) kept.delete(oldest);
}

type QueryOptions = { keep?: boolean };

/**
 * Para LEER al entrar a una pantalla. Solo GET: adentro llama a api.get().
 *
 * Se dispara solo, no hay que invocarlo: al montar, cuando cambia `path` y
 * cuando llamás a `reload()` (útil para un botón de "Reintentar").
 *
 *   const { data, loading, error } = useApiQuery<Product[]>('/products');
 *
 * Dos detalles de implementación: la ruta va como string y no como función
 * (una función inline cambia de identidad en cada render y dispararía el
 * request para siempre), y `loading` es derivado en vez de un useState, así
 * cambiar de ruta no muestra por un instante los datos de la anterior.
 */
export function useApiQuery<T>(path: string, { keep = false }: QueryOptions = {}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  const key = `${attempt}|${path}`;

  useEffect(() => {
    // Descarta respuestas de una ruta que ya no se mira, y cubre el doble
    // montaje de StrictMode en desarrollo. El request igual sigue viajando:
    // cancelarlo es deuda técnica para después del MVP (docs/deuda-tecnica.md).
    let active = true;

    // useEffect no puede ser async: tiene que devolver la función de limpieza,
    // no una promesa. Por eso la async va adentro.
    async function load() {
      try {
        const data = await api.get<T>(path);
        if (keep) keepResponse(path, data);
        if (active) setResult({ key, data, error: null });
      } catch (e) {
        if (active) setResult({ key, data: null, error: toApiError(e) });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [path, key, keep]);

  const current = result?.key === key ? result : null;
  const remembered = keep ? ((kept.get(path) as T | undefined) ?? null) : null;
  const data = current?.data ?? remembered;
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data,
    // Con algo guardado para mostrar, un fallo al volver a pedirlo no tapa la pantalla.
    error: data === null ? (current?.error ?? null) : null,
    loading: current === null && data === null,
    /** Lo último que llegó, aunque sea de otra ruta: sirve para no vaciar la pantalla mientras carga la nueva. */
    previousData: result?.data ?? null,
    reload,
  };
}

/**
 * Para MUTACIONES cuando el usuario hace algo: login, registro, agregar al
 * carrito, borrar una dirección. Sirve para cualquier método (post, patch,
 * put, delete) porque recibe la llamada ya armada.
 *
 * Al revés que useApiQuery, no se dispara solo: corre cuando llamás a `run()`,
 * normalmente desde un onSubmit o un onClick. `run` devuelve lo que respondió
 * la API, o null si falló — el error queda en `error`, listo para mostrar.
 *
 *   const { run, loading } = useApiAction((email: string, password: string) =>
 *     api.post<LoginResponse>('/auth/login', { email, password }),
 *   );
 */
export function useApiAction<Args extends unknown[], T>(action: (...args: Args) => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function run(...args: Args): Promise<T | null> {
    setLoading(true);
    setError(null);

    try {
      return await action(...args);
    } catch (e) {
      setError(toApiError(e));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error };
}
