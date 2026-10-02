import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import FormAlert from '../components/FormAlert';
import ShowPasswordToggle from '../components/ShowPasswordToggle';
import SubmitButton from '../components/SubmitButton';
import TextField from '../components/TextField';
import { api } from '../lib/api';
import { emailError, focusField } from '../lib/forms';
import { useApiAction } from '../hooks/useApi';
import { useSessionStore, type AuthResult } from '../stores/session-store';

// En el orden de la pantalla: el foco va al primer campo con error.
const FIELDS = ['email', 'password'] as const;

export default function Login() {
  // La ruta a la que volver, si la hay (ver login-redirect); también viaja a /registro.
  const redirectState: unknown = useLocation().state;
  const setSession = useSessionStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Lo último que se envió: el 401 habla de ese par y de ningún otro.
  const [sent, setSent] = useState({ email: '', password: '' });

  const { run, loading, error } = useApiAction((email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }),
  );

  useEffect(() => {
    document.title = 'Ingresar | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  // Derivados: se muestran recién al enviar y se van solos al corregir el campo.
  const errors = {
    email: emailError(email),
    password: password === '' ? 'Ingresá tu contraseña' : null,
  };
  const shown = submitAttempted ? errors : null;

  const credentialsError =
    error?.status === 401 && sent.email === email && sent.password === password
      ? error
      : null;
  const formError = error && error.status !== 401 ? error : null;

  // El mensaje del 401 está debajo de la contraseña: el foco va ahí.
  useEffect(() => {
    if (error?.status === 401) focusField('password');
  }, [error]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return; // el botón usa aria-disabled, que no frena el envío

    setSubmitAttempted(true);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setSent({ email, password });
    const result = await run(email, password);
    // Con la sesión iniciada, RequireGuest saca de esta pantalla.
    if (result) setSession(result);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-scaps-canvas px-6 py-12 lg:px-12">
      <div className="w-full max-w-110 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8">
        <h1 className="font-display text-heading text-scaps-text">
          Ingresar
        </h1>

        {/* noValidate: los avisos los da el formulario, no el globo del navegador. */}
        <form noValidate className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <TextField
            id="email"
            label="Email"
            type="email"
            required
            // "username" y no "email": el navegador lo empareja con la contraseña guardada.
            autoComplete="username"
            value={email}
            onChange={setEmail}
            error={shown?.email}
            invalid={credentialsError !== null}
          />

          {/* Login no indica cuál de los dos campos falló a propósito —
              el backend usa el mismo mensaje para email inexistente y
              contraseña incorrecta (ver docs/deuda-tecnica.md). */}
          <TextField
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={shown?.password ?? credentialsError?.message}
          >
            <ShowPasswordToggle
              checked={showPassword}
              onChange={setShowPassword}
            />
          </TextField>

          {formError && <FormAlert messages={formError.messages} />}

          <SubmitButton loading={loading} loadingLabel="Ingresando…">
            Ingresar
          </SubmitButton>

          <p className="text-center text-sm text-scaps-text-secondary">
            ¿No tenés cuenta?{' '}
            <Link
              to="/registro"
              state={redirectState}
              className="text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
            >
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
