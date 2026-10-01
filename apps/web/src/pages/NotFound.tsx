import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6">
      <h1 className="text-3xl font-semibold text-slate-50">404 — Página no encontrada</h1>
      <Link to="/" className="font-bold text-slate-50 hover:underline hover:scale-102">
        Volver a la landing
      </Link>
    </main>
  );
}
