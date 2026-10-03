import { Link } from 'react-router';

// mt-auto lo baja al fondo aunque la página no ocupe el alto (un guard que devuelve null).
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-scaps-border bg-scaps-nav px-6 py-6 lg:px-12">
      <div className="mx-auto flex max-w-page flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-scaps-text">
            Scaps · © {new Date().getFullYear()}
          </p>
          <p className="text-xs text-scaps-text-muted">
            Proyecto demo, los productos son ficticios y no están a la venta.
          </p>
        </div>
        <Link
          to="/creditos"
          className="-my-3 self-start py-3 text-sm text-scaps-text-secondary underline-offset-4 hover:text-scaps-text hover:underline md:self-auto"
        >
          Créditos de los modelos 3D
        </Link>
      </div>
    </footer>
  );
}
