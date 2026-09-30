import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useSessionStore } from '../stores/session-store';
import logoUrl from '../assets/logo.svg';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'border-b border-scaps-border-primary text-sm font-medium text-scaps-text'
    : 'text-sm font-medium text-scaps-text-secondary transition-colors hover:text-scaps-text';

function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);

  return (
    <>
      <li>
        <NavLink to="/catalogo" className={navLinkClassName} onClick={onNavigate}>
          Catálogo
        </NavLink>
      </li>
      {status === 'authenticated' && user ? (
        <>
          <li className="text-sm text-scaps-text-secondary">{user.nombre}</li>
          <li>
            <button
              type="button"
              onClick={() => {
                clearSession();
                onNavigate();
              }}
              className="text-sm font-medium text-scaps-text-secondary transition-colors hover:text-scaps-text"
            >
              Cerrar sesión
            </button>
          </li>
        </>
      ) : status === 'anonymous' ? (
        <>
          <li>
            <NavLink to="/login" className={navLinkClassName} onClick={onNavigate}>
              Ingresar
            </NavLink>
          </li>
          <li>
            <NavLink to="/registro" className={navLinkClassName} onClick={onNavigate}>
              Registrarse
            </NavLink>
          </li>
        </>
      ) : null}
    </>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav className="border-b border-scaps-border bg-scaps-nav px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" onClick={closeMenu}>
          <img src={logoUrl} alt="Scaps" className="h-6 w-auto max-w-35 md:h-7" />
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          <NavLinks onNavigate={closeMenu} />
        </ul>

        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className="h-0.5 w-5 bg-scaps-text" />
          <span className="h-0.5 w-5 bg-scaps-text" />
          <span className="h-0.5 w-5 bg-scaps-text" />
        </button>
      </div>

      {open && (
        <ul className="mt-4 flex flex-col gap-4 md:hidden">
          <NavLinks onNavigate={closeMenu} />
        </ul>
      )}
    </nav>
  );
}
