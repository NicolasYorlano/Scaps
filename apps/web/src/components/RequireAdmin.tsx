import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSessionStore } from '../stores/session-store';
import RequireAuth from './RequireAuth';

// RequireAuth más es_admin: sin sesión, al cerrarla o si no se pudo verificar,
// hace lo mismo que las otras rutas con sesión. Un usuario común va a la landing:
// no hay pantalla de "no tenés permiso", y /login lo rebotaría.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminOnly>{children}</AdminOnly>
    </RequireAuth>
  );
}

// Adentro de RequireAuth: solo se dibuja con sesión, y ahí ya se sabe si es admin.
function AdminOnly({ children }: { children: ReactNode }) {
  const isAdmin = useSessionStore((s) => s.user?.es_admin ?? false);
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}
