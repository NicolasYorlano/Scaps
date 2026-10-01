import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { loginState } from '../lib/login-redirect';
import { useSessionStore } from '../stores/session-store';

// Igual que RequireAuth, pero además exige es_admin. Un usuario común va a la
// landing: no hay pantalla de "no tenés permiso", y /login lo rebotaría.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const isAdmin = useSessionStore((s) => s.user?.es_admin ?? false);
  const location = useLocation();

  if (status === 'checking') return null;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={loginState(location)} />;
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}
