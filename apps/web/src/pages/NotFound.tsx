import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-scaps-canvas px-6">
      <h1 className="font-display text-heading text-scaps-text">404 — Página no encontrada</h1>
      <Link to="/" className="font-bold text-scaps-text hover:underline hover:scale-102">
        Volver a la landing
      </Link>
    </main>
  );
}
