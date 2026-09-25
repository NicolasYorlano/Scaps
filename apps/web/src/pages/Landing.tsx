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

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
    </div>
  );
}
