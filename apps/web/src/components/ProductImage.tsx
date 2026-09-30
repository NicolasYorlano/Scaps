import type { GalleryImage } from '../types/product';

// Clases escritas enteras: Tailwind no genera las que se arman en runtime.
const ASPECT_CLASS = {
  square: 'aspect-square', // card del catálogo
  detail: 'aspect-[700/520]', // imagen grande de la ficha
} as const;

type Props = {
  /** imagen_principal de una card o una GalleryImage. */
  image: Pick<GalleryImage, 'url' | 'alt'>;
  aspect: keyof typeof ASPECT_CLASS;
};

/** Foto entera sobre un área del mismo blanco. El ancho lo pone el contenedor. */
export default function ProductImage({ image, aspect }: Props) {
  // span y no div: puede ir dentro de un <button> (miniaturas de la ficha).
  return (
    <span
      className={`block w-full overflow-hidden rounded-scaps bg-scaps-photo ${ASPECT_CLASS[aspect]}`}
    >
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    </span>
  );
}
