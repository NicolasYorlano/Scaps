import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSessionStore } from '../stores/session-store';

// Igual que RequireAuth, pero además exige es_admin. Un usuario común que
// entra a una ruta de admin también termina en /login: no hay una pantalla
// separada de "no tenés permiso" (no está en la consigna).
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const isAdmin = useSessionStore((s) => s.user?.es_admin ?? false);

  if (status === 'checking') return null;
  if (status === 'anonymous' || !isAdmin) return <Navigate to="/login" replace />;

  return children;
}
