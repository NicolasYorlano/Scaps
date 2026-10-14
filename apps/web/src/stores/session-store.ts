import { create } from 'zustand';
import { api, ApiError, toApiError } from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/token';

// Mismo shape que UserResponse del backend (ver docs/contrato-api): es el
// objeto `user` que devuelven /auth/register, /auth/login y /auth/me.
export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_admin: boolean;
  creado_en: string;
  actualizado_en: string;
}

// Lo que devuelven /auth/register y /auth/login. Login.tsx y Registro.tsx le
// pasan esto tal cual a setSession cuando el backend responde bien.
export interface AuthResult {
  user: SessionUser;
  token: string;
}

type SessionStatus =
  | 'checking' // arrancando la app: hay que esperar a que hydrate() termine
  | 'authenticated'
  | 'anonymous';

type SessionStore = {
  user: SessionUser | null;
  status: SessionStatus;
  /** El token sigue guardado pero no se pudo verificar (sin red, servidor caído): se puede reintentar. */
  sessionError: ApiError | null;
  /** La última sesión terminó porque el token venció: el login lo avisa. */
  expired: boolean;
  /** Login/registro exitoso: guarda el token y deja al usuario logueado. */
  setSession: (result: AuthResult) => void;
  /** Logout: no hay endpoint en el servidor (JWT sin estado), así que cerrar
   * sesión es solo borrar el token del cliente. */
  clearSession: () => void;
  /** El servidor rechazó el token (401) a mitad de uso: descarta la sesión. */
  expireSession: () => void;
  /** Al arrancar la app y cuando otra pestaña cambia el token: si hay uno guardado,
   * confirma con el servidor que sigue vivo antes de dar la sesión por buena. */
  hydrate: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  // Sin token guardado no hay nada que verificar: las rutas protegidas deciden de entrada.
  status: getToken() === null ? 'anonymous' : 'checking',
  sessionError: null,
  expired: false,

  setSession: ({ user, token }) => {
    setToken(token);
    set({ user, status: 'authenticated', sessionError: null, expired: false });
  },

  clearSession: () => {
    clearToken();
    set({ user: null, status: 'anonymous', sessionError: null, expired: false });
  },

  expireSession: () => {
    clearToken();
    set({ user: null, status: 'anonymous', sessionError: null, expired: true });
  },

  hydrate: async () => {
    const token = getToken();

    if (token === null) {
      // Con un usuario en memoria, es otra pestaña que cerró la sesión.
      set({ user: null, status: 'anonymous', sessionError: null });
      return;
    }

    // El usuario que había puede no ser el de este token: otra pestaña cambió de cuenta.
    set({ user: null, status: 'checking', sessionError: null });

    try {
      const user = await api.get<SessionUser>('/auth/me');
      // Un login o logout durante la espera deja vieja esta respuesta.
      if (getToken() !== token) return;
      set({ user, status: 'authenticated', expired: false });
    } catch (error) {
      if (getToken() !== token) return;
      // Solo un 401 invalida el token: un corte de red o un 5xx no dicen nada de él.
      const expired = error instanceof ApiError && error.status === 401;
      if (expired) clearToken();
      // Sin 401 el token queda guardado: lo que falló es la verificación, y se anota.
      set({ user: null, status: 'anonymous', expired, sessionError: expired ? null : toApiError(error) });
    }
  },
}));
