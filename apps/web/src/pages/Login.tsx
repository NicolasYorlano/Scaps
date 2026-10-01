import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import FormAlert from '../components/FormAlert';
import ShowPasswordToggle from '../components/ShowPasswordToggle';
import SubmitButton from '../components/SubmitButton';
import { api } from '../lib/api';
import { useApiAction } from '../hooks/useApi';
import { useSessionStore, type AuthResult } from '../stores/session-store';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { run, loading, error } = useApiAction((email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }),
  );

  // Solo el 401 habla de los campos; una falla de red o del servidor, no.
  const credentialsError = error?.status === 401 ? error : null;
  const formError = credentialsError ? null : error;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return; // el botón usa aria-disabled, que no frena el envío
    const result = await run(email, password);
    if (result) {
      setSession(result);
      void navigate('/');
    }
  }

  if (status === 'authenticated' && user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-scaps-canvas px-6 py-12 lg:px-12">
        <div className="w-full max-w-110 rounded-scaps border border-scaps-border bg-scaps-card p-6 text-center sm:p-8">
          <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
            Ya iniciaste sesión
          </h1>
          <p className="mt-2 text-sm text-scaps-text-secondary">
            Estás conectado como {user.email}.
          </p>
          <button
            type="button"
            onClick={() => clearSession()}
            className="mt-6 h-12 w-full rounded-scaps border border-scaps-border-primary bg-transparent px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-scaps-canvas px-6 py-12 lg:px-12">
      <div className="w-full max-w-110 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8">
        <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
          Inicio de sesión
        </h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={credentialsError ? true : undefined}
              className={`h-11 rounded-scaps border ${credentialsError ? 'border-scaps-error' : 'border-scaps-border-input'} bg-scaps-sunken px-3.5 text-sm text-scaps-text placeholder:text-scaps-text-annotation`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
            >
              Contraseña
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={credentialsError ? true : undefined}
              className={`h-11 rounded-scaps border ${credentialsError ? 'border-scaps-error' : 'border-scaps-border-input'} bg-scaps-sunken px-3.5 text-sm text-scaps-text`}
            />
            {/* Login no indica cuál de los dos campos falló a propósito —
                el backend usa el mismo mensaje para email inexistente y
                contraseña incorrecta (ver docs/deuda-tecnica.md). */}
            {credentialsError && (
              <p role="alert" className="text-xs font-medium text-scaps-error">
                {credentialsError.message}
              </p>
            )}
            <ShowPasswordToggle
              checked={showPassword}
              onChange={setShowPassword}
            />
          </div>

          {formError && <FormAlert messages={formError.messages} />}

          <SubmitButton loading={loading} loadingLabel="Ingresando…">
            Ingresar
          </SubmitButton>

          <p className="text-center text-sm text-scaps-text-secondary">
            ¿No tenés cuenta?{' '}
            <Link
              to="/registro"
              className={`text-scaps-text underline-offset-4 hover:underline`}
            >
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
