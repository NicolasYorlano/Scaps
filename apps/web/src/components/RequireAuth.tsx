import { useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { focusField } from '../lib/forms';
import { loginState } from '../lib/login-redirect';
import { useSessionStore } from '../stores/session-store';

type Props = {
  children: ReactNode;
  /** La pantalla sabe esperar (muestra su esqueleto): se dibuja también mientras se verifica la sesión. */
  showWhileChecking?: boolean;
};

/** El token está guardado pero el servidor no contestó: se reintenta sin volver a ingresar. */
function SessionCheckFailed({ message }: { message: string }) {
  function retry() {
    void useSessionStore.getState().hydrate();
    // El botón desaparece al reintentar: el foco va al contenido.
    focusField('contenido', { preventScroll: true });
  }

  return (
    <main className="flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12">
      <section className="mx-auto flex w-full max-w-311 flex-col items-center gap-4 rounded-scaps border border-scaps-border bg-scaps-card px-6 py-16 text-center">
        <h1 className="font-display text-heading text-scaps-text">No pudimos verificar tu sesión</h1>
        <p role="alert" className="max-w-md text-sm text-scaps-text-secondary">
          {message}
        </p>
        <button
          type="button"
          onClick={retry}
          className="flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}

// Bloquea el paso a rutas que exigen estar logueado.
//
// Mientras la sesión se está rehidratando (justo al recargar la página) el
// status es 'checking': todavía no se sabe si hay usuario. No conviene
// redirigir de una en ese momento, porque mandaría al login a alguien que en
// realidad sigue logueado — se espera a que 'checking' termine.
export default function RequireAuth({ children, showWhileChecking = false }: Props) {
  const status = useSessionStore((s) => s.status);
  const sessionError = useSessionStore((s) => s.sessionError);
  const expired = useSessionStore((s) => s.expired);
  const location = useLocation();
  // Hubo sesión con esta pantalla abierta: si se cierra acá, no se le pide que ingrese.
  const [hadSession, setHadSession] = useState(false);
  if (status === 'authenticated' && !hadSession) setHadSession(true);

  if (status === 'checking') return showWhileChecking ? children : null;
  if (status === 'anonymous') {
    if (sessionError) return <SessionCheckFailed message={sessionError.message} />;
    // Cerró sesión, acá o en otra pestaña: a la portada. Si venció, al login, que lo avisa.
    if (hadSession && !expired) return <Navigate to="/" replace />;
    // Lleva la ruta pedida, para volver a ella después de ingresar.
    return <Navigate to="/login" replace state={loginState(location)} />;
  }

  return children;
}
