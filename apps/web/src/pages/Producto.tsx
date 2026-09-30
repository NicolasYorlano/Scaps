import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import ProductImage from '../components/ProductImage';
import { useApiQuery } from '../hooks/useApi';
import { formatPrice } from '../lib/format-price';
import type { ProductDetail } from '../types/product';

const pageClassName = 'flex flex-1 flex-col bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Migas de pan" className="text-sm text-scaps-text-muted">
      <Link to="/catalogo" className="hover:text-scaps-text hover:underline">
        Catálogo
      </Link>
      {name && (
        <>
          <span className="mx-2">/</span>
          <span className="text-scaps-text-secondary">{name}</span>
        </>
      )}
    </nav>
  );
}

function Gallery({ product }: { product: ProductDetail }) {
  const images = [...product.imagenes].sort((a, b) => a.orden - b.orden);
  // La selección recuerda de qué producto es: al cambiar de slug vuelve sola a la principal.
  const [selected, setSelected] = useState<{ slug: string; id: string } | null>(null);

  const main = images.find((img) => img.es_principal) ?? images[0];
  const active =
    (selected?.slug === product.slug && images.find((img) => img.id === selected.id)) || main;

  if (!active) return null;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
      <div className="min-w-0 max-w-175 flex-1 md:order-2">
        <ProductImage image={active} aspect="detail" />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto md:order-1 md:w-20 md:flex-col md:overflow-visible md:gap-4">
          {images.map((img) => {
            const isActive = img.id === active.id;
            return (
              <li key={img.id} className="w-16 shrink-0 md:w-full">
                <button
                  type="button"
                  aria-label={img.alt}
                  aria-current={isActive}
                  onClick={() => setSelected({ slug: product.slug, id: img.id })}
                  className={`block w-full rounded-scaps border-2 p-0.5 transition-colors ${
                    isActive
                      ? 'border-scaps-border-primary'
                      : 'border-scaps-border hover:border-scaps-border-input'
                  }`}
                >
                  <ProductImage image={img} aspect="square" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Producto() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: product, error, loading, reload } = useApiQuery<ProductDetail>(
    `/products/${encodeURIComponent(slug)}`,
  );

  // La SPA no vuelve sola arriba al cambiar de ruta.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const name = product?.nombre;
  useEffect(() => {
    document.title = name ? `${name} | Scaps` : 'Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, [name]);

  if (loading) {
    return (
      <main className={pageClassName}>
        <Breadcrumb />
        <p className="mt-8 text-sm text-scaps-text-secondary">Cargando producto…</p>
      </main>
    );
  }

  if (error?.status === 404) {
    return (
      <main className={`${pageClassName} items-center justify-center gap-4 text-center`}>
        <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
          Producto no encontrado
        </h1>
        <p className="text-sm text-scaps-text-secondary">
          El producto que buscás no existe o ya no está disponible.
        </p>
        <Link
          to="/catalogo"
          className="text-sm font-medium text-scaps-text underline underline-offset-4 hover:text-scaps-text-secondary"
        >
          Volver al catálogo
        </Link>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className={`${pageClassName} items-center justify-center gap-4 text-center`}>
        <p role="alert" className="text-sm text-scaps-text-secondary">
          {error?.message ?? 'No se pudo cargar el producto.'}
        </p>
        <button
          type="button"
          onClick={reload}
          className="h-12 rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight"
        >
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <main className={pageClassName}>
      <Breadcrumb name={product.nombre} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
        <Gallery product={product} />

        <section className="flex flex-col gap-4">
          <h1 className="text-[25px] leading-[1.1] font-medium text-scaps-text">
            {product.nombre}
          </h1>
          <p className="text-xl font-medium text-scaps-text">{formatPrice(product.precio)}</p>
          <p className="text-sm text-scaps-text-secondary">
            {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
          </p>
          {product.descripcion && (
            <p className="text-sm leading-relaxed whitespace-pre-line text-scaps-text-secondary">
              {product.descripcion}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
