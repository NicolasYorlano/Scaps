import { useState } from 'react';
import type { GalleryImage } from '../types/product';

// Clases escritas enteras: Tailwind no genera las que se arman en runtime.
const ASPECT_CLASS = {
  square: 'aspect-square', // card del catálogo
  detail: 'aspect-square md:aspect-[700/520]', // imagen grande de la ficha: cuadrada en el celular, como las fotos
} as const;

type Props = {
  /** imagen_principal de una card o una GalleryImage. */
  image: Pick<GalleryImage, 'url' | 'alt'>;
  aspect: keyof typeof ASPECT_CLASS;
};

/** Foto entera sobre un área del mismo blanco. El ancho lo pone el contenedor. */
export default function ProductImage({ image, aspect }: Props) {
  // Guarda la url y no un booleano: al cambiar de foto, la nueva vuelve a aparecer suave.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = loadedUrl === image.url;

  // span y no div: puede ir dentro de un <button> (miniaturas de la ficha).
  // Texto oscuro: si la foto no carga, su alt se lee sobre el blanco.
  return (
    <span
      className={`block w-full overflow-hidden rounded-scaps bg-scaps-photo text-scaps-page ${ASPECT_CLASS[aspect]}`}
    >
      <img
        key={image.url}
        src={image.url}
        alt={image.alt}
        loading="lazy"
        onLoad={() => setLoadedUrl(image.url)}
        // Si falla, se muestra igual: queda el alt a la vista.
        onError={() => setLoadedUrl(image.url)}
        className={`h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${loaded ? '' : 'opacity-0'}`}
      />
    </span>
  );
}
