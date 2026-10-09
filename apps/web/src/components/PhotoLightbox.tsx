import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useSwipe } from '../hooks/useSwipe';
import type { GalleryImage } from '../types/product';

type Props = {
  images: GalleryImage[];
  /** Id de la foto a la vista; null es cerrado. */
  currentId: string | null;
  onChange: (id: string) => void;
  onClose: () => void;
};

const buttonClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-scaps border border-scaps-border-primary bg-scaps-canvas text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';

const ICON_PATHS = {
  previous: 'M10 3.5L5.5 8l4.5 4.5',
  next: 'M6 3.5L10.5 8 6 12.5',
  close: 'M4 4l8 8M12 4l-8 8',
} as const;

function Icon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 fill-none stroke-current stroke-[1.5]"
    >
      <path d={ICON_PATHS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * La foto ampliada, sobre toda la pantalla. Es un <dialog> modal: el navegador
 * atrapa el foco adentro, cierra con Esc y lo devuelve a donde estaba.
 */
export default function PhotoLightbox({images, currentId, onChange, onClose}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const index = images.findIndex((img) => img.id === currentId);
  const current = index === -1 ? null : images[index];
  const open = current !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Da la vuelta: de la última se pasa a la primera.
  function step(by: 1 | -1) {
    onChange(images[(index + by + images.length) % images.length].id);
  }

  const swipe = useSwipe(step);

  function handleKeyDown(event: KeyboardEvent) {
    if (images.length < 2) return;
    if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Fotos del producto"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="h-dvh max-h-none w-screen max-w-none bg-transparent backdrop:bg-scaps-page/90"
    >
      {current && (
        // Un clic en el fondo, fuera de la foto y los botones, cierra.
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) dialogRef.current?.close();
          }}
          className="flex h-full w-full flex-wrap content-center items-center justify-center gap-4 p-4 md:grid md:grid-cols-[2.75rem_auto_2.75rem] md:gap-6"
        >
          {/* Primero en el DOM: es donde cae el foco al abrir. */}
          {/* Pegado a la foto: arriba en el celular (esta fila mide lo que la foto), al costado desde md. */}
          <div className="pointer-events-none flex w-[min(100%,calc(100dvh-15rem))] justify-end md:contents">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => dialogRef.current?.close()}
              className={`${buttonClassName} pointer-events-auto md:col-start-3 md:row-start-1 md:self-start`}
            >
              <Icon name="close" />
            </button>
          </div>

          {/* En el celular va todo en columna: cerrar, la foto a todo el ancho y las flechas. */}
          <figure className="relative flex justify-center max-md:basis-full md:col-start-2 md:row-start-1">
            {/* El fondo va en un envoltorio: la foto se multiplica contra él, como en ProductImage. */}
            <div className="aspect-square w-[min(100%,calc(100dvh-15rem))] overflow-hidden rounded-scaps bg-scaps-photo md:w-[min(calc(100vw-13rem),calc(100dvh-4rem),75rem)]">
              <img
                src={current.url}
                alt={current.alt}
                {...swipe.handlers}
                className="h-full w-full touch-pan-y object-contain mix-blend-multiply"
              />
            </div>
            {images.length > 1 && (
              <figcaption
                aria-hidden="true"
                className="absolute bottom-3 rounded-full bg-scaps-canvas px-3 py-1 text-xs text-scaps-text-secondary tabular-nums"
              >
                {index + 1} / {images.length}
              </figcaption>
            )}
          </figure>

          {images.length > 1 && (
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => step(-1)}
              className={`${buttonClassName} md:col-start-1 md:row-start-1`}
            >
              <Icon name="previous" />
            </button>
          )}

          {images.length > 1 && (
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => step(1)}
              className={`${buttonClassName} md:col-start-3 md:row-start-1`}
            >
              <Icon name="next" />
            </button>
          )}

          <p role="status" className="sr-only">
            Foto {index + 1} de {images.length}
          </p>
        </div>
      )}
    </dialog>
  );
}
