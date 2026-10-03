import type { ComponentProps, ReactNode } from 'react';

type InputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'onChange' | 'className' | 'children'
>;

type Props = InputProps & {
  id: string;
  label: string;
  onChange: (value: string) => void;
  /** Error del campo: lo marca en rojo y reemplaza a la ayuda. */
  error?: string | null;
  /** Lo marca en rojo sin mensaje propio: el error se lee en otro campo. */
  invalid?: boolean;
  hint?: string;
  /** Lo que va debajo del mensaje, como "Mostrar contraseña". */
  children?: ReactNode;
};

/** Campo de un formulario: etiqueta, input y su ayuda o su error. */
export default function TextField({ id, label, onChange, error, invalid = false, hint, children, ...input }: Props) {
  const marked = invalid || Boolean(error);
  // El mensaje queda atado al input: un lector de pantalla lo lee al entrar al campo.
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
      >
        {label}
      </label>
      {/* name = id por defecto: es lo que leen los gestores de contraseñas. */}
      {/* 16 px en el celular: con menos, iOS acerca la página al enfocar el campo. */}
      <input
        name={id}
        {...input}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={marked ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`h-11 rounded-scaps border ${marked ? 'border-scaps-error' : 'border-scaps-border-input'} bg-scaps-sunken px-3.5 text-base text-scaps-text md:text-sm`}
      />
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="text-xs font-medium text-scaps-error"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-xs text-scaps-text-muted">
            {hint}
          </p>
        )
      )}
      {children}
    </div>
  );
}
