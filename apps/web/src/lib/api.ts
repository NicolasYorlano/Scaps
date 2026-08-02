import { getToken } from './token';
import { useRequestStore } from '../stores/request-store';

// Único punto de paso de las llamadas a la API: ninguna pantalla escribe fetch().
// Las rutas van sin /api, porque VITE_API_URL ya lo incluye:
//   api.get('/health') → http://localhost:3000/api/health

// Heredamos de 'Error' (una clase nativa de JavaScript).
// Esto nos da funcionalidades base gratis y nos permite usar 'throw' para lanzar 
// esta clase como si fuera un error estándar del lenguaje.
/** `status` es el código HTTP, salvo 0: ahí el request nunca llegó al servidor. */
export class ApiError extends Error {
  readonly status: number;
  /** El `message` de NestJS puede venir como lista; acá están todos. */
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Ocurrió un error inesperado.');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function baseUrl(): string {
  const base = import.meta.env.VITE_API_URL;

  if (!base) {
    throw new ApiError(0, [
      'Falta configurar VITE_API_URL. Copiá apps/web/.env.example a apps/web/.env y volvé a levantar el frontend.',
    ]);
  }

  return base.replace(/\/+$/, ''); // tolera la barra final
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  // FormData va tal cual: el navegador le pone el boundary (uploads, Sprint 4).
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

/** El body de la response no siempre es JSON: un 204 viene vacío y un 502 de Render viene en HTML. */
async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text === '') return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Traduce el `{ statusCode, message, error }` de NestJS. */
function errorMessages(body: unknown, status: number): string[] {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;

    if (Array.isArray(message)) {
      const texts = message.filter((m): m is string => typeof m === 'string');
      if (texts.length > 0) return texts;
    }

    if (typeof message === 'string' && message !== '') return [message];
  }

  return [`El servidor respondió con un error (${status}).`];
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const url = baseUrl() + path;
  const headers: Record<string, string> = {};

  // Casi todos los endpoints piden el token; los públicos lo ignoran.
  const token = getToken();
  if (token !== null) headers.Authorization = `Bearer ${token}`;

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Fuera del try: un JSON.stringify que falla es error del front, y adentro
  // quedaría disfrazado de "no se pudo conectar".
  const payload = buildBody(body);

  useRequestStore.getState().start();

  try {
    let res: Response;

    try {
      res = await fetch(url, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, [
        'No se pudo conectar con el servidor. Chekea que el backend esté levantado y volvé a intentar.',
      ]);
    }

    const data = await readBody(res);

    // fetch no rechaza ante un 401 o un 409, solo si se cae la red: sin este
    // chequeo la pantalla sigue de largo con los datos en undefined.
    if (!res.ok) {
      throw new ApiError(res.status, errorMessages(data, res.status));
    }

    return data as T; // un 204 devuelve null
  } finally {
    useRequestStore.getState().finish();
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = null>(path: string) => request<T>('DELETE', path),
};
