import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 md:px-10 bg-white border-b border-gray-200">
      <span className="text-xl font-bold tracking-tight text-gray-900">
        Scaps
      </span>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <Link to="/" className="hover:text-gray-900">Inicio</Link>
        <Link to="/catalogo" className="hover:text-gray-900">Catálogo</Link>
        <Link to="/nosotros" className="hover:text-gray-900">Nosotros</Link>
      </div>
      <Link
        to="/catalogo"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Ver catálogo
      </Link>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center md:min-h-[80vh]">
      {/* Imagen de fondo fija (reemplazar src por el asset real del producto) */}
      <img
        src="/images/hero-gorra.jpg"
        alt="Gorra destacada Scaps"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex max-w-xl flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-white md:text-6xl">
          Scaps
        </h1>
        <p className="text-base text-gray-200 md:text-lg">
          Gorras con visor 3D. Elegí, personalizá y mirala desde todos los ángulos.
        </p>
        <Link
          to="/catalogo"
          className="mt-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 md:text-base"
        >
          Ver catálogo
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Hero />
    </div>
  );
}
