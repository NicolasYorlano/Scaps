import { useState, type ChangeEvent } from 'react';
import { IMAGE_ACCEPT, MODEL_ACCEPT, imageFileError, modelFileError } from '../lib/uploads';

const RULES = {
  model: { accept: MODEL_ACCEPT, check: modelFileError },
  image: { accept: IMAGE_ACCEPT, check: imageFileError },
};

type Props = {
  id: string;
  label: string;
  /** El modelo 3D (.glb) o una imagen: define qué deja elegir y con qué reglas lo valida. */
  kind: keyof typeof RULES;
  /** Recibe solo los archivos válidos, y solo si hay alguno. Quién los guarda o sube es la pantalla. */
  onSelect: (files: File[]) => void;
  multiple?: boolean;
  hint?: string;
  /** El error que le pasa la pantalla al guardar, por ejemplo "Elegí un modelo .glb". */
  error?: string | null;
  disabled?: boolean;
};

/**
 * Campo para elegir archivos del panel: el alta, la edición y la galería. Es el
 * input nativo con el botón estilado, así anda con el teclado sin trucos.
 * Valida antes de subir y muestra el motivo de los archivos que rechaza.
 */
export default function FileField({ id, label, kind, onSelect, multiple = false, hint, error, disabled = false }: Props) {
  const [rejected, setRejected] = useState<string[]>([]);
  const { accept, check } = RULES[kind];

  const messages = [...rejected, ...(error ? [error] : [])];
  const marked = messages.length > 0;
  // El mensaje queda atado al input, como en TextField.
  const messageId = `${id}-message`;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Vacío después de cada elección: así se puede volver a elegir el mismo archivo.
    e.target.value = '';
    if (files.length === 0) return;

    const valid: File[] = [];
    const reasons: string[] = [];
    for (const file of files) {
      const reason = check(file);
      if (reason) reasons.push(reason);
      else valid.push(file);
    }

    setRejected(reasons);
    if (valid.length > 0) onSelect(valid);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted"
      >
        {label}
      </label>
      {/* text-[0px] esconde el "Ningún archivo seleccionado" del navegador: como el valor se vacía
          después de cada elección, lo diría siempre. El botón lleva su propio tamaño de letra. */}
      <input
        type="file"
        id={id}
        name={id}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        aria-invalid={marked ? true : undefined}
        aria-describedby={marked || hint ? messageId : undefined}
        className={`max-w-full cursor-pointer self-start rounded-scaps text-[0px] file:mr-0 file:h-11file:cursor-pointer file:rounded-scaps file:border file:bg-transparent file:px-5 file:text-sm file:font-medium file:transition-colors disabled:cursor-not-allowed disabled:file:cursor-not-allowed disabled:file:border-scaps-border disabled:file:text-scaps-text-annotation ${marked ? 'file:border-scaps-error' : 'file:border-scaps-border-input enabled:hover:file:border-scaps-border-primary'} file:text-scaps-text-secondary enabled:hover:file:bg-scaps-card-highlight enabled:hover:file:text-scaps-text-on-primary`}
      />
      {marked ? (
        <div
          id={messageId}
          role="alert"
          className="flex flex-col gap-1 text-xs font-medium wrap-break-word text-scaps-error"
        >
          {messages.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
        </div>
      ) : (
        hint && (
          <p id={messageId} className="text-xs text-scaps-text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
