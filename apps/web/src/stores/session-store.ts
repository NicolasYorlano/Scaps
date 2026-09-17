import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
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
  /** Login/registro exitoso: guarda el token y deja al usuario logueado. */
  setSession: (result: AuthResult) => void;
  /** Logout: no hay endpoint en el servidor (JWT sin estado), así que cerrar
   * sesión es solo borrar el token del cliente. */
  clearSession: () => void;
  /** Llamar una vez al arrancar la app. Si hay token guardado, confirma con
   * el servidor que sigue vivo antes de dar la sesión por buena. */
  hydrate: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  status: 'checking',

  setSession: ({ user, token }) => {
    setToken(token);
    set({ user, status: 'authenticated' });
  },

  clearSession: () => {
    clearToken();
    set({ user: null, status: 'anonymous' });
  },

  hydrate: async () => {
    const token = getToken();

    if (token === null) {
      set({ status: 'anonymous' });
      return;
    }

    try {
      const user = await api.get<SessionUser>('/auth/me');
      // Un login o logout durante la espera deja vieja esta respuesta.
      if (getToken() !== token) return;
      set({ user, status: 'authenticated' });
    } catch (error) {
      if (getToken() !== token) return;
      // Solo un 401 invalida el token: un corte de red o un 5xx no dicen nada de él.
      if (error instanceof ApiError && error.status === 401) clearToken();
      set({ user: null, status: 'anonymous' });
    }
  },
}));
