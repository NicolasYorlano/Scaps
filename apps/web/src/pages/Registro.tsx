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

interface RegisterArgs {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

const MIN_PASSWORD_LENGTH = 8;

// En el orden de la pantalla: el foco va al primer campo con error.
const FIELDS = ['nombre', 'apellido', 'email', 'password'] as const;

export default function Registro() {
  // La ruta a la que volver, si la hay (ver login-redirect); también viaja a /login.
  const redirectState: unknown = useLocation().state;
  const setSession = useSessionStore((s) => s.setSession);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // El email del último envío: el 409 habla de ese y de ningún otro.
  const [sentEmail, setSentEmail] = useState('');

  const { run, loading, error } = useApiAction((body: RegisterArgs) =>
    api.post<AuthResult>('/auth/register', body),
  );

  useEffect(() => {
    document.title = 'Crear cuenta | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  // Derivados: se muestran recién al enviar y se van solos al corregir el campo.
  const errors = {
    nombre: nombre === '' ? 'Ingresá tu nombre' : null,
    apellido: apellido === '' ? 'Ingresá tu apellido' : null,
    email: emailError(email),
    password:
      password.length < MIN_PASSWORD_LENGTH
        ? `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
        : null,
  };
  const shown = submitAttempted ? errors : null;

  // El 409 es el email duplicado: el único error del servidor que señala un campo.
  const emailTaken = error?.status === 409 && sentEmail === email ? error : null;
  const formError = error && error.status !== 409 ? error : null;

  useEffect(() => {
    if (error?.status === 409) focusField('email');
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

    setSentEmail(email);
    const result = await run({ nombre, apellido, email, password });
    // Con la sesión iniciada, RequireGuest saca de esta pantalla.
    if (result) setSession(result);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-scaps-canvas px-6 py-12 lg:px-12">
      <div className="w-full max-w-110 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8">
        <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">Crear cuenta</h1>

        {/* noValidate: los avisos los da el formulario, no el globo del navegador. */}
        <form noValidate className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="nombre"
              label="Nombre"
              required
              autoComplete="given-name"
              value={nombre}
              onChange={setNombre}
              error={shown?.nombre}
            />
            <TextField
              id="apellido"
              label="Apellido"
              required
              autoComplete="family-name"
              value={apellido}
              onChange={setApellido}
              error={shown?.apellido}
            />
          </div>

          <TextField
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={shown?.email ?? emailTaken?.message}
          />

          <TextField
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={shown?.password}
            hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          >
            <ShowPasswordToggle
              checked={showPassword}
              onChange={setShowPassword}
            />
          </TextField>

          {formError && <FormAlert messages={formError.messages} />}

          <SubmitButton loading={loading} loadingLabel="Creando cuenta…">
            Crear cuenta
          </SubmitButton>

          <p className="text-center text-sm text-scaps-text-secondary">
            ¿Ya tenés cuenta?{' '}
            <Link
              to="/login"
              state={redirectState}
              className="text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
            >
              Ingresar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
