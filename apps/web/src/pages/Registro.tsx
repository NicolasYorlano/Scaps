import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { useApiAction } from '../hooks/useApi';
import { useSessionStore, type AuthResult } from '../stores/session-store';

interface RegisterArgs {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

const LABEL_CLASS = 'text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted';
const INPUT_CLASS = `h-11 rounded-scaps border border-scaps-border-input bg-scaps-sunken px-3.5 text-sm text-scaps-text placeholder:text-scaps-text-annotation`;

export default function Registro() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { run, loading, error } = useApiAction((body: RegisterArgs) =>
    api.post<AuthResult>('/auth/register', body),
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const result = await run({ nombre, apellido, email, password });
    if (result) {
      setSession(result);
      void navigate('/');
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-scaps-canvas px-6 py-12 lg:px-12">
      <div className="w-full max-w-110 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8">
        <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">Crear cuenta</h1>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nombre" className={LABEL_CLASS}>
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                required
                autoComplete="given-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="apellido" className={LABEL_CLASS}>
                Apellido
              </label>
              <input
                id="apellido"
                type="text"
                required
                autoComplete="family-name"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={LABEL_CLASS}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              className={`h-11 rounded-scaps border ${error ? 'border-scaps-error' : 'border-scaps-border-input'} bg-scaps-sunken px-3.5 text-sm text-scaps-text placeholder:text-scaps-text-annotation`}
            />
            {/* El único error que devuelve el backend en registro es el
                email duplicado, así que va marcado en este campo. */}
            {error && (
              <p role="alert" className="text-xs font-medium text-scaps-error">
                {error.messages.join(' ')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={LABEL_CLASS}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={passwordError ? true : undefined}
              className={`h-11 rounded-scaps border ${passwordError ? 'border-scaps-error' : 'border-scaps-border-input'} bg-scaps-sunken px-3.5 text-sm text-scaps-text placeholder:text-scaps-text-annotation`}
            />
            {passwordError ? (
              <p role="alert" className="text-xs font-medium text-scaps-error">
                {passwordError}
              </p>
            ) : (
              <span className="text-xs text-scaps-text-annotation">Mínimo 8 caracteres</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`h-12 rounded-scaps border border-scaps-border-primary bg-transparent px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight disabled:cursor-not-allowed disabled:border-scaps-border disabled:text-scaps-text-annotation disabled:hover:bg-transparent`}
          >
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </button>

          <p className="text-center text-sm text-scaps-text-secondary">
            ¿Ya tenés cuenta?{' '}
            <Link
              to="/login"
              className={`text-scaps-text underline-offset-4 hover:underline`}
            >
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
