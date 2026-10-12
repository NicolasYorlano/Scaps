import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useCartStatus, useCartUnitCount } from '../stores/cart-store';
import { useSessionStore } from '../stores/session-store';
import CartIcon from './CartIcon';
import logoUrl from '../assets/logo.svg';

// Área táctil de 44 px de alto sin mover el texto: el ::after se estira sobre el <li>.
const touchTarget = 'after:absolute after:inset-x-0 after:-inset-y-2.5';

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `border-b border-scaps-border-primary text-sm font-medium text-scaps-text ${touchTarget}`
    : `text-sm font-medium text-scaps-text-secondary transition-colors hover:text-scaps-text ${touchTarget}`;

// showName: en el celular el nombre ya está en la barra y no se repite en el menú.
function NavLinks({ onNavigate, showName }: { onNavigate: () => void; showName: boolean }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  // Entre /login y /registro viaja la ruta a la que volver (ver login-redirect).
  const redirectState: unknown = useLocation().state;

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
          {showName && (
            <li
              className="max-w-56 truncate text-sm text-scaps-text-secondary"
              title={user.nombre}
            >
              {user.nombre}
            </li>
          )}
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
            <NavLink
              to="/login"
              state={redirectState}
              className={navLinkClassName}
              onClick={onNavigate}
            >
              Ingresar
            </NavLink>
          </li>
          <li className="relative">
            <NavLink
              to="/registro"
              state={redirectState}
              className={navLinkClassName}
              onClick={onNavigate}
            >
              Crear cuenta
            </NavLink>
          </li>
        </>
      ) : null}
    </>
  );
}

// Va solo con sesión. Sin texto: el número va en el aria-label, porque el
// globito solo no lo anuncia un lector de pantalla.
function CartLink({ onNavigate, className = '' }: { onNavigate: () => void; className?: string }) {
  const units = useCartUnitCount();
  // Hasta que el carrito carga, o si la carga falló, no se sabe cuántas hay: no se afirma un 0.
  const loaded = useCartStatus() === 'ready';
  const hasBadge = units > 0;

  return (
    <NavLink
      to="/carrito"
      aria-label={loaded ? `Carrito, ${units} ${units === 1 ? 'unidad' : 'unidades'}` : 'Carrito'}
      onClick={onNavigate}
      // 44 px de área táctil con un ícono de 20; el margen negativo no agranda la barra.
      // Con globito, la caja se corre 5 px: el anillo de foco queda centrado en el ícono con su globito.
      className={({ isActive }) =>
        `relative -my-0.5 block h-11 w-11 shrink-0 transition-colors ${hasBadge ? 'translate-x-1.25' : ''} ${
          isActive ? 'text-scaps-text' : 'text-scaps-text-secondary hover:text-scaps-text'
        } ${className}`
      }
    >
      {({ isActive }) => (
        // El contenido vuelve esos 5 px: en pantalla solo se mueve la caja.
        <span
          className={`absolute inset-0 flex items-center justify-center ${hasBadge ? '-translate-x-1.25' : ''}`}
        >
          <CartIcon className="h-5 w-5" />
          {/* Sección activa: la misma raya que subraya a los demás enlaces. */}
          {isActive && (
            <span className="absolute inset-x-3 bottom-2 border-b border-scaps-border-primary" />
          )}
          {hasBadge && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 left-6 h-4.5 min-w-4.5 rounded-full bg-scaps-text px-1 text-center text-[0.6875rem] leading-4.5 font-medium text-scaps-page"
            >
              {units > 99 ? '99+' : units}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const userName = useSessionStore((s) =>
    s.status === 'authenticated' ? s.user?.nombre : undefined,
  );
  const hasSession = userName !== undefined;
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
      <div className="mx-auto flex min-h-10 max-w-page items-center justify-between gap-4">
        <Link to="/" onClick={closeMenu} className="-my-2.5 shrink-0 py-2.5">
          <img src={logoUrl} alt="Scaps" className="h-6 w-auto max-w-35 md:h-7" />
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          <NavLinks onNavigate={closeMenu} showName />
          {/* Al final, después de Cerrar sesión. El margen negativo deja el ícono a ras del
              borde, como las rayitas del menú en el celular. */}
          {hasSession && (
            <li>
              <CartLink onNavigate={closeMenu} className="-mx-3" />
            </li>
          )}
        </ul>

        {/* Con el menú cerrado, el nombre a la vista es la única señal de que hay sesión. */}
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          {userName && (
            <span
              className="truncate text-sm text-scaps-text-secondary"
              title={userName}
            >
              {userName}
            </span>
          )}
          {/* En la barra y no en el menú: el número se ve sin abrir nada. */}
          {hasSession && <CartLink onNavigate={closeMenu} />}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
            className="-my-0.5 -mr-3 flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5"
          >
            <span className="h-0.5 w-5 bg-scaps-text" />
            <span className="h-0.5 w-5 bg-scaps-text" />
            <span className="h-0.5 w-5 bg-scaps-text" />
          </button>
        </div>
      </div>

      {open && (
        <ul ref={menuRef} className="mt-4 flex flex-col gap-5 md:hidden">
          <NavLinks onNavigate={closeMenu} showName={false} />
        </ul>
      )}
    </nav>
  );
}
