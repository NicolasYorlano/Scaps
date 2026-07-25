import { Link, NavLink } from 'react-router';

const links: { to: string; label: string }[] = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/producto/ejemplo', label: 'Producto' },
  { to: '/carrito', label: 'Carrito' },
  { to: '/checkout', label: 'Checkout' },
  { to: '/mis-direcciones', label: 'Mis Direcciones' },
  { to: '/login', label: 'Login' },
  { to: '/registro', label: 'Registro' },
  { to: '/admin', label: 'Admin' },
];

export default function Navbar() {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-6 py-4">
      <Link
        to="/"
        className="text-lg font-semibold text-slate-50 transition-colors hover:text-emerald-400"
      >
        Scaps
      </Link>
      <ul className="flex flex-wrap items-center gap-4">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                isActive
                  ? 'text-sm font-medium text-emerald-400'
                  : 'text-sm font-medium text-slate-400 hover:text-slate-100'
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
