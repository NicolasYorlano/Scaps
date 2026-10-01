import type { ReactNode } from 'react';

type Props = {
  loading: boolean;
  /** Texto mientras el pedido está en curso, por ejemplo "Ingresando…". */
  loadingLabel: string;
  children: ReactNode;
};

/** Botón de envío de un formulario que espera a la API. */
export default function SubmitButton({loading, loadingLabel, children}: Props) {
  return (
    // aria-disabled y no disabled: un botón deshabilitado suelta el foco.
    // Quien ignora el envío mientras carga es el formulario.
    <button
      type="submit"
      aria-disabled={loading}
      className={`flex h-12 items-center justify-center gap-2 rounded-scaps border border-scaps-border-primary bg-transparent px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight ${loading ? 'cursor-progress' : ''}`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
        />
      )}
      {loading ? loadingLabel : children}
    </button>
  );
}
