import { useState } from 'react';
import type { GalleryImage } from '../types/product';

// Clases escritas enteras: Tailwind no genera las que se arman en runtime.
const ASPECT_CLASS = {
  square: 'aspect-square', // card del catálogo
  detail: 'aspect-square md:aspect-[700/520]', // imagen grande de la ficha: cuadrada en el celular, como las fotos
} as const;

// Fotos que ya cargaron en esta pestaña: al volver a una pantalla no repiten el fundido.
const loadedUrls = new Set<string>();

type Props = {
  /** imagen_principal de una card o una GalleryImage. */
  image: Pick<GalleryImage, 'url' | 'alt'>;
  aspect: keyof typeof ASPECT_CLASS;
  /** Va junto a un texto que ya la nombra, como en la card: sin alt. */
  decorative?: boolean;
  /** Está a la vista apenas abre la pantalla: se pide enseguida. */
  priority?: boolean;
};

/** Foto entera sobre un área del mismo blanco. El ancho lo pone el contenedor. */
export default function ProductImage({ image, aspect, decorative = false, priority = false }: Props) {
  // Guarda la url y no un booleano: al cambiar de foto, la nueva vuelve a aparecer suave.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const loaded = loadedUrl === image.url || loadedUrls.has(image.url);

  // span y no div: puede ir dentro de un <button> (miniaturas de la ficha).
  return (
    <span
      className={`block w-full overflow-hidden rounded-scaps bg-scaps-photo ${ASPECT_CLASS[aspect]}`}
    >
      {failedUrl === image.url ? (
        // Si la foto no carga, un ícono propio en lugar del que pone el navegador.
        <span
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : image.alt}
          aria-hidden={decorative ? true : undefined}
          className="flex h-full w-full items-center justify-center text-scaps-text-annotation"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="aspect-square h-1/5 max-h-10 min-h-5 fill-none stroke-current stroke-[1.5]"
          >
            <path
              d="M3 5.5h18v13H3zM3 15.5l4.5-4.5 4 4 3-3 6.5 5M4 3l16 18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <img
          key={image.url}
          src={image.url}
          alt={decorative ? '' : image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => {
            loadedUrls.add(image.url);
            setLoadedUrl(image.url);
          }}
          onError={() => setFailedUrl(image.url)}
          className={`h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${loaded ? '' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
