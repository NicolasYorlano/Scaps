import { useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { focusField } from '../lib/forms';
import { loginState } from '../lib/login-redirect';
import { useSessionStore } from '../stores/session-store';

type Props = {
  children: ReactNode;
  /** La pantalla sabe esperar (muestra su esqueleto): se dibuja también mientras se verifica la sesión. */
  showWhileChecking?: boolean;
  /** La pantalla es una card angosta (/pedido): el error de sesión sale con esas medidas. */
  narrow?: boolean;
};

/** El token está guardado pero el servidor no contestó: se reintenta sin volver a ingresar. */
function SessionCheckFailed({ message, narrow }: { message: string; narrow: boolean }) {
  function retry() {
    void useSessionStore.getState().hydrate();
    // El botón desaparece al reintentar: el foco va al contenido.
    focusField('contenido', { preventScroll: true });
  }

  return (
    <main
      data-stable-scrollbar={narrow ? '' : undefined}
      className={`flex flex-1 flex-col bg-scaps-canvas px-6 py-8 ${narrow ? 'md:py-16 md:short:py-4' : 'lg:px-12 lg:py-12'}`}
    >
      <section
        className={`mx-auto flex w-full flex-col items-center gap-4 rounded-scaps border border-scaps-border bg-scaps-card text-center ${narrow ? 'max-w-130 px-5 py-12 md:px-8' : 'max-w-311 px-6 py-16'}`}
      >
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
export default function RequireAuth({ children, showWhileChecking = false, narrow = false }: Props) {
  const status = useSessionStore((s) => s.status);
  const sessionError = useSessionStore((s) => s.sessionError);
  const expired = useSessionStore((s) => s.expired);
  const location = useLocation();
  // Hubo sesión con esta pantalla abierta: si se cierra acá, no se le pide que ingrese.
  const [hadSession, setHadSession] = useState(false);
  if (status === 'authenticated' && !hadSession) setHadSession(true);

  if (status === 'checking') return showWhileChecking ? children : null;
  if (status === 'anonymous') {
    if (sessionError) return <SessionCheckFailed message={sessionError.message} narrow={narrow} />;
    // Cerró sesión, acá o en otra pestaña: a la portada. Si venció, al login, que lo avisa.
    if (hadSession && !expired) return <Navigate to="/" replace />;
    // Lleva la ruta pedida, para volver a ella después de ingresar.
    return <Navigate to="/login" replace state={loginState(location)} />;
  }

  return children;
}
