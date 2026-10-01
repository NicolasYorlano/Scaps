import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { returnPath } from '../lib/login-redirect';
import { useSessionStore } from '../stores/session-store';

// El inverso de RequireAuth, para /login y /registro: quien ya tiene sesión
// sigue hacia donde iba. También es quien saca de ahí al ingresar o registrarse.
// Mientras se verifica la sesión muestra el formulario: en blanco podría ser un minuto.
export default function RequireGuest({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();

  if (status === 'authenticated') {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  return children;
}
