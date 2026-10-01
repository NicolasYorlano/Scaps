import { Link } from 'react-router';

function Hero() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Imagen de fondo fija (reemplazar src por el asset real del producto) */}
      <img
        src="/images/hero-gorra.jpg"
        alt="Gorra destacada Scaps"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-scaps-page/50" />

      <div className="relative z-10 flex max-w-xl flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-scaps-text md:text-6xl">
          Scaps
        </h1>
        <p className="text-base text-scaps-text-secondary md:text-lg">
          Gorras con visor 3D. Elegí, personalizá y mirala desde todos los ángulos.
        </p>
        {/* Invertido a propósito: el relleno usa el color del texto. */}
        <Link
          to="/catalogo"
          className="mt-2 rounded-md bg-scaps-text px-6 py-3 text-sm font-semibold text-scaps-page hover:bg-scaps-text-secondary md:text-base"
        >
          Ver catálogo
        </Link>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
    </div>
  );
}
