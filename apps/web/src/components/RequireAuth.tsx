import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSessionStore } from '../stores/session-store';

// Bloquea el paso a rutas que exigen estar logueado.
//
// Mientras la sesión se está rehidratando (justo al recargar la página) el
// status es 'checking': todavía no se sabe si hay usuario. No conviene
// redirigir de una en ese momento, porque mandaría al login a alguien que en
// realidad sigue logueado — se espera a que 'checking' termine.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);

  if (status === 'checking') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;

  return children;
}
