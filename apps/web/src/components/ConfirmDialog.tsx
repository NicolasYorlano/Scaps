import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import FormAlert from './FormAlert';
import { toApiError, type ApiError } from '../lib/api';

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  /** Lo que hace el botón, por ejemplo "Dar de baja": el peligro lo dice el texto, no un color. */
  confirmLabel: string;
  /** Rechaza si falla (como api.delete): el error se muestra adentro y el diálogo sigue abierto. */
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};

const buttonClassName =
  'flex h-12 items-center justify-center gap-2 rounded-scaps border px-6 text-sm font-medium transition-colors sm:min-w-36';

const confirmClassName =
  'border-scaps-border-primary text-scaps-text-on-primary hover:bg-scaps-card-highlight aria-disabled:cursor-progress';

const cancelClassName =
  'border-scaps-border-input text-scaps-text-secondary hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary aria-disabled:cursor-not-allowed aria-disabled:hover:border-scaps-border-input aria-disabled:hover:bg-transparent aria-disabled:hover:text-scaps-text-secondary';

/**
 * Pide confirmación antes de una acción que no se deshace sola. Es un <dialog>
 * modal, como PhotoLightbox: el navegador atrapa el foco adentro, cierra con
 * Esc y lo devuelve al botón que lo abrió.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleConfirm() {
    if (running) return; // aria-disabled no frena el clic
    setRunning(true);
    setError(null);
    try {
      await onConfirm();
      dialogRef.current?.close();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setRunning(false);
    }
  }

  // Mientras la acción corre, Esc no cierra. El keydown cubre a Chrome, que
  // deja pasar el segundo Esc aunque el cancel se cancele.
  function handleCancel(event: SyntheticEvent) {
    if (running) event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (running && event.key === 'Escape') event.preventDefault();
  }

  // Se vuelve a abrir limpio, sin el error de la vez anterior.
  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClose={handleClose}
      // Aparece con un fundido corto; sin animación si el sistema pide menos movimiento.
      className="m-auto w-[calc(100%-2rem)] max-w-120 rounded-scaps border border-scaps-border bg-scaps-card p-6 text-scaps-text shadow-2xl shadow-black/60 transition-[opacity,translate] duration-200 ease-out backdrop:bg-scaps-page/80 backdrop:backdrop-blur-sm starting:open:translate-y-2 starting:open:opacity-0 motion-reduce:transition-none sm:p-8"
    >
      <h2
        id={titleId}
        className="font-display text-[1.75rem] leading-tight font-medium text-scaps-text"
      >
        {title}
      </h2>

      <div
        id={messageId}
        className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-scaps-text-secondary"
      >
        {message}
      </div>

      {error && (
        <div className="mt-5">
          <FormAlert messages={error.messages} />
        </div>
      )}

      {/* Cancelar va primero en el DOM: es donde cae el foco al abrir, así un Enter apurado no confirma. */}
      <div className="mt-6 flex flex-col gap-3 border-t border-scaps-border-row pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          aria-disabled={running}
          onClick={() => {
            if (!running) dialogRef.current?.close();
          }}
          className={`${buttonClassName} ${cancelClassName}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          aria-disabled={running}
          onClick={() => void handleConfirm()}
          className={`${buttonClassName} ${confirmClassName}`}
        >
          {running && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
            />
          )}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
