import { Link } from 'react-router';

export default function NuevoProducto() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-scaps-canvas px-6">
      <h1 className="font-display text-heading text-scaps-text">Nuevo producto</h1>
      <Link
        to="/admin"
        className="inline-flex min-h-11 items-center text-sm font-medium text-scaps-text-secondary underline underline-offset-4 transition-colors hover:text-scaps-text"
      >
        Volver al panel
      </Link>
    </main>
  );
}
