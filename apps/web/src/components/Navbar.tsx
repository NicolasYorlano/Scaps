import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useSessionStore } from '../stores/session-store';
import logoUrl from '../assets/logo.svg';

// Área táctil de 44 px de alto sin mover el texto: el ::after se estira sobre el <li>.
const touchTarget = 'after:absolute after:inset-x-0 after:-inset-y-2.5';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `border-b border-scaps-border-primary text-sm font-medium text-scaps-text ${touchTarget}`
    : `text-sm font-medium text-scaps-text-secondary transition-colors hover:text-scaps-text ${touchTarget}`;

function NavLinks({ onNavigate }: { onNavigate: () => void }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);

  return (
    <>
      <li className="relative">
        <NavLink to="/catalogo" className={navLinkClassName} onClick={onNavigate}>
          Catálogo
        </NavLink>
      </li>
      {status === 'authenticated' && user ? (
        <>
          {/* Sin tope de largo en el registro: se corta con "…" para no romper la barra. */}
          <li
            className="max-w-56 truncate text-sm text-scaps-text-secondary"
            title={user.nombre}
          >
            {user.nombre}
          </li>
          <li className="relative">
            <button
              type="button"
              onClick={() => {
                clearSession();
                onNavigate();
              }}
              className={`text-sm font-medium text-scaps-text-secondary transition-colors hover:text-scaps-text ${touchTarget}`}
            >
              Cerrar sesión
            </button>
          </li>
        </>
      ) : status === 'anonymous' ? (
        <>
          <li className="relative">
            <NavLink to="/login" className={navLinkClassName} onClick={onNavigate}>
              Ingresar
            </NavLink>
          </li>
          <li className="relative">
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      // El menú se desmonta: si el foco estaba adentro, vuelve al botón en vez de perderse.
      if (menuRef.current?.contains(document.activeElement)) menuButtonRef.current?.focus();
      setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <nav className="border-b border-scaps-border bg-scaps-nav px-6 py-4 lg:px-12">
      {/* Fila de 40 px: la barra mide lo mismo en todos los anchos. Los márgenes negativos dan
          44 px de área táctil sin agrandarla y dejan las rayitas del botón sobre el margen. */}
      <div className="flex min-h-10 items-center justify-between gap-4">
        <Link to="/" onClick={closeMenu} className="-my-2.5 py-2.5">
          <img src={logoUrl} alt="Scaps" className="h-6 w-auto max-w-35 md:h-7" />
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          <NavLinks onNavigate={closeMenu} />
        </ul>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen((v) => !v)}
          className="-my-0.5 -mr-3 flex h-11 w-11 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span className="h-0.5 w-5 bg-scaps-text" />
          <span className="h-0.5 w-5 bg-scaps-text" />
          <span className="h-0.5 w-5 bg-scaps-text" />
        </button>
      </div>

      {open && (
        <ul ref={menuRef} className="mt-4 flex flex-col gap-5 md:hidden">
          <NavLinks onNavigate={closeMenu} />
        </ul>
      )}
    </nav>
  );
}
