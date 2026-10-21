import { useEffect, useRef, useState, type FormEvent } from 'react';
import ArrowIcon from './ArrowIcon';
import ConfirmDialog from './ConfirmDialog';
import FileField from './FileField';
import FormAlert from './FormAlert';
import ImageIcon from './ImageIcon';
import ProductImage from './ProductImage';
import SubmitButton from './SubmitButton';
import TextField from './TextField';
import TrashIcon from './TrashIcon';
import { api, sentence, toApiError } from '../lib/api';
import { focusField } from '../lib/forms';
import { MAX_ALT_LENGTH, MAX_IMAGES, altError } from '../lib/product-images';
import { uploadImage } from '../lib/uploads';
import type { GalleryImage, ProductDetail } from '../types/product';

const TITLE_ID = 'gallery-title';
const NEW_FILE_ID = 'gallery-new-file';
const NEW_ALT_ID = 'gallery-new-alt';

// El ancho lo decide la sección y no la pantalla (@container): la galería vive dentro de la card de la edición.
//   angosta: una tarjeta por imagen, con la miniatura y el texto alternativo arriba y las acciones abajo, a todo el ancho
//   @lg: una lista con las filas separadas, como la tabla del panel; las acciones, en una columna fija a la derecha
const listClassName =
  'flex flex-col gap-3 @lg:gap-0 @lg:divide-y @lg:divide-scaps-border-row @lg:rounded-scaps @lg:border @lg:border-scaps-border';
// La columna de las acciones mide lo que sus cuatro botones: sin Hacer portada (la portada), los inputs quedan alineados igual.
const rowClassName =
  'grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 rounded-scaps border border-scaps-border p-4 @lg:grid-cols-[6rem_minmax(0,1fr)_11.5rem] @lg:items-center @lg:gap-x-5 @lg:rounded-none @lg:border-0 @lg:px-5';
const thumbCellClassName = 'relative col-start-1 row-start-1';
const altCellClassName = 'col-start-2 row-start-1 flex min-w-0 flex-col gap-2';
// Pegadas a la derecha: sin Hacer portada, Subir, Bajar y Borrar quedan en su lugar.
const actionsCellClassName = 'col-span-2 flex gap-2 @lg:col-span-1 @lg:justify-end';

// Las acciones de una imagen, con ícono, como las del listado del panel: en la tarjeta se reparten el ancho,
// con 44 px de alto; en la lista son cuadradas.
const actionClassName =
  'flex h-11 flex-1 items-center justify-center rounded-scaps border border-scaps-border-input text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary @lg:h-10 @lg:w-10 @lg:flex-none';
const actionIconClassName = 'size-4.5';
// Apagadas mientras corre otra acción o cuando no hay nada que hacer, como en el listado del panel.
const disabledClassName =
  'aria-disabled:cursor-not-allowed aria-disabled:border-scaps-border aria-disabled:text-scaps-text-annotation aria-disabled:hover:border-scaps-border aria-disabled:hover:bg-transparent aria-disabled:hover:text-scaps-text-annotation';

// Guardar, al lado del texto alternativo: con la altura del input. Los colores van por separado, como en SubmitButton.
const saveClassName =
  'flex h-11 shrink-0 items-center justify-center gap-2 rounded-scaps border px-5 text-sm font-medium whitespace-nowrap transition-colors';
const saveEnabledClassName = 'border-scaps-border-primary text-scaps-text-on-primary hover:bg-scaps-card-highlight';
const saveDisabledClassName = 'cursor-not-allowed border-scaps-border text-scaps-text-annotation';

// La forma de los carteles de la tienda, sobre la foto como Sin stock en la card. Invertido como Destacado:
// es la que se busca de un vistazo.
const coverBadgeClassName =
  'pointer-events-none absolute top-1 left-1 rounded-full border border-scaps-page/15 bg-scaps-text px-2 py-0.5 text-[11px] font-medium tracking-wider whitespace-nowrap text-scaps-page uppercase @lg:top-1.5 @lg:left-1.5';

type RowAction = 'alt' | 'cover' | 'delete';
type Direction = -1 | 1;

/** La imagen elegida para agregar y, cuando ya subió, su URL: si falla el POST, al reintentar no se vuelve a subir. */
type PickedImage = {
  file: File;
  /** URL local para la vista previa; se libera al cambiarla, al agregarla o al salir. */
  preview: string;
  url: string | null;
};

function altId(image: GalleryImage) {
  return `gallery-${image.id}-alt`;
}

function moveId(image: GalleryImage, direction: Direction) {
  return `gallery-${image.id}-${direction < 0 ? 'up' : 'down'}`;
}

function deleteId(image: GalleryImage) {
  return `gallery-${image.id}-delete`;
}

function deleteReasonId(image: GalleryImage) {
  return `gallery-${image.id}-delete-reason`;
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none"
    />
  );
}

type AddProps = {
  productId: string;
  /** Ya tiene 10 imágenes: el tope del contrato. */
  full: boolean;
  onStart: () => void;
  onFail: (messages: string[]) => void;
  /** Se intentó el POST: la galería se vuelve a pedir. */
  onSettled: () => Promise<void>;
};

/** Agregar una imagen, de a una: se sube y se suma al final de la galería, sin hacerla portada. */
function AddImageForm({ productId, full, onStart, onFail, onSettled }: AddProps) {
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [alt, setAlt] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Qué se está haciendo: lo dice el botón. null mientras no se agrega.
  const [progress, setProgress] = useState<string | null>(null);
  // Un doble clic no agrega dos veces: el estado no llega a cambiar entre los dos.
  const inFlight = useRef(false);
  // Las vistas previas vivas, para liberarlas al salir.
  const previews = useRef(new Set<string>());

  const adding = progress !== null;
  const locked = adding || full;
  const fileError = picked === null ? 'Elegí una imagen' : null;
  const newAltError = altError(alt);

  useEffect(() => {
    const urls = previews.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function release(image: PickedImage | null) {
    if (!image) return;
    URL.revokeObjectURL(image.preview);
    previews.current.delete(image.preview);
  }

  function selectImage(files: File[]) {
    release(picked);
    const preview = URL.createObjectURL(files[0]);
    previews.current.add(preview);
    // Un archivo nuevo descarta la URL del anterior.
    setPicked({ file: files[0], preview, url: null });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // El botón usa aria-disabled, que no frena el envío.
    if (inFlight.current || full) return;

    setSubmitAttempted(true);
    const firstInvalid = fileError ? NEW_FILE_ID : newAltError ? NEW_ALT_ID : null;
    if (firstInvalid || !picked) {
      if (firstInvalid) focusField(firstInvalid);
      return;
    }

    inFlight.current = true;
    onStart();

    try {
      let url = picked.url;
      if (url === null) {
        setProgress('Subiendo la imagen…');
        try {
          url = await uploadImage(picked.file);
        } catch (error) {
          onFail([`No se pudo subir ${picked.file.name}. ${sentence(toApiError(error).message)}`]);
          return;
        }
        const uploaded = url;
        setPicked((prev) => (prev?.file === picked.file ? { ...prev, url: uploaded } : prev));
      }

      setProgress('Agregando…');
      try {
        // Sin orden, el backend la pone al final; sin es_principal, no la hace portada.
        await api.post<GalleryImage>(`/products/${productId}/images`, { url, alt: alt.trim() });
        release(picked);
        setPicked(null);
        setAlt('');
        setSubmitAttempted(false);
      } catch (error) {
        onFail(toApiError(error).messages);
      }
      await onSettled();
    } finally {
      inFlight.current = false;
      setProgress(null);
    }
  }

  return (
    // noValidate: los avisos los da el formulario, no el globo del navegador.
    <form
      noValidate
      className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 rounded-scaps border border-dashed border-scaps-border-input p-4 @lg:grid-cols-[6rem_minmax(0,1fr)] @lg:gap-x-5 @lg:px-5"
      onSubmit={(e) => void handleSubmit(e)}
    >
      {/* El lugar de la imagen nueva: la vista previa cuando hay una elegida. */}
      <div className="col-start-1 row-start-1">
        {picked ? (
          <ProductImage image={{ url: picked.preview, alt: '' }} aspect="square" decorative />
        ) : (
          <span className="flex aspect-square items-center justify-center rounded-scaps border border-scaps-border bg-scaps-sunken text-scaps-text-annotation">
            <ImageIcon className="size-6" />
          </span>
        )}
      </div>

      {/* Los campos se deshabilitan mientras se agrega; el botón no: con aria-disabled conserva el foco. */}
      <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-2">
        <FileField
          id={NEW_FILE_ID}
          label="Agregar imagen"
          kind="image"
          onSelect={selectImage}
          error={submitAttempted ? fileError : null}
          disabled={locked}
        />
        {picked && <p className="text-sm wrap-break-word text-scaps-text-secondary">{picked.file.name}</p>}
      </div>
      <div className="col-span-2 @lg:col-span-1 @lg:col-start-2">
        <TextField
          id={NEW_ALT_ID}
          label="Texto alternativo"
          autoComplete="off"
          maxLength={MAX_ALT_LENGTH}
          value={alt}
          onChange={setAlt}
          disabled={locked}
          error={submitAttempted ? newAltError : null}
        />
      </div>

      <div className="col-span-2 flex flex-col @lg:col-span-1 @lg:col-start-2 @lg:flex-row">
        <SubmitButton loading={adding} loadingLabel={progress ?? ''} disabled={full}>
          Agregar
        </SubmitButton>
      </div>
    </form>
  );
}

type Props = {
  productId: string;
  /** La galería que trajo la pantalla. Después de cada acción, se vuelve a pedir. */
  initialImages: GalleryImage[];
};

/**
 * La sección Imágenes de la edición: cada acción va directo a su endpoint y se guarda en el momento.
 * Después de cada una, la galería se vuelve a pedir: la portada y el orden los resuelve el backend.
 */
export default function GalleryEditor({ productId, initialImages }: Props) {
  // Lo guardado, en el orden de `orden`, como lo manda la API.
  const [images, setImages] = useState(initialImages);
  // Lo escrito en cada texto alternativo, mientras no se guarda.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Las imágenes con una acción en curso: sus controles se deshabilitan.
  const [busy, setBusy] = useState<Record<string, RowAction>>({});
  // Al mover, cambian varias a la vez: se deshabilita toda la galería.
  const [moving, setMoving] = useState<{ id: string; direction: Direction } | null>(null);
  const [confirming, setConfirming] = useState<{ image: GalleryImage; position: number } | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);

  // Lo mismo que busy y moving, para los clics: el estado no llega a cambiar entre dos seguidos.
  const rowsInFlight = useRef(new Set<string>());
  const movingInFlight = useRef(false);
  // Solo vale la última galería pedida: una respuesta vieja no pisa una nueva.
  const lastRefresh = useRef(0);
  // Si el botón con el foco desaparece con la galería nueva, el foco va acá en vez de perderse.
  const focusAfter = useRef<string | null>(null);
  const mounted = useRef(true);

  const full = images.length >= MAX_IMAGES;
  const onlyOne = images.length === 1;
  // Mover cambia el orden de varias: espera a que terminen las demás acciones.
  const canMove = moving === null && Object.keys(busy).length === 0;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const id = focusAfter.current;
    if (id === null) return;
    focusAfter.current = null;
    // Solo si el foco se perdió: si ya siguió con otra cosa, no se lo saca.
    const active = document.activeElement;
    if (active === null || active === document.body) {
      focusField(document.getElementById(id) ? id : TITLE_ID);
    }
  });

  async function refresh(focusId?: string) {
    const request = ++lastRefresh.current;
    try {
      const product = await api.get<ProductDetail>(`/admin/products/${productId}`);
      if (!mounted.current || request !== lastRefresh.current) return;
      focusAfter.current = focusId ?? null;
      setImages(product.imagenes);
    } catch (e) {
      // Sin poder ponerse al día, la galería queda como estaba. Si ya hay un aviso, es el que importa.
      if (mounted.current && request === lastRefresh.current) {
        const { messages } = toApiError(e);
        setErrors((prev) => prev ?? messages);
      }
    }
  }

  function startRow(image: GalleryImage, action: RowAction) {
    if (movingInFlight.current || rowsInFlight.current.has(image.id)) return false;
    rowsInFlight.current.add(image.id);
    setBusy((prev) => ({ ...prev, [image.id]: action }));
    setErrors(null);
    return true;
  }

  function releaseRow(image: GalleryImage) {
    rowsInFlight.current.delete(image.id);
    if (mounted.current) setBusy((prev) => without(prev, image.id));
  }

  async function finishRow(image: GalleryImage, focusId?: string) {
    await refresh(focusId);
    releaseRow(image);
  }

  async function runRow(image: GalleryImage, action: RowAction, call: () => Promise<void>, focusId?: string) {
    if (!startRow(image, action)) return;
    try {
      await call();
    } catch (e) {
      setErrors(toApiError(e).messages);
    }
    await finishRow(image, focusId);
  }

  function setDraft(image: GalleryImage, alt: string) {
    setDrafts((prev) => ({ ...prev, [image.id]: alt }));
  }

  function saveAlt(e: FormEvent<HTMLFormElement>, image: GalleryImage) {
    e.preventDefault();
    // El botón usa aria-disabled, que no frena el envío.
    const alt = (drafts[image.id] ?? image.alt).trim();
    if (alt === '' || alt === image.alt) return;

    void runRow(image, 'alt', async () => {
      const updated = await api.patch<GalleryImage>(`/products/${productId}/images/${image.id}`, { alt });
      setImages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDrafts((prev) => without(prev, image.id));
    });
  }

  function makeCover(image: GalleryImage) {
    // Hacer portada desaparece: el foco pasa a Subir, el que ocupa su lugar.
    void runRow(
      image,
      'cover',
      async () => {
        // El backend desmarca la anterior.
        await api.patch(`/products/${productId}/images/${image.id}`, { es_principal: true });
      },
      moveId(image, -1),
    );
  }

  async function move(index: number, direction: Direction) {
    const target = index + direction;
    if (movingInFlight.current || rowsInFlight.current.size > 0 || target < 0 || target >= images.length) return;

    const moved = images[index];
    const order = [...images];
    [order[index], order[target]] = [order[target], order[index]];
    // Numeradas desde 0: solo las que cambiaron de posición. Así se corrigen solos los huecos de los borrados.
    const changes = order
      .map((image, orden) => ({ image, orden }))
      .filter(({ image, orden }) => image.orden !== orden);

    movingInFlight.current = true;
    setMoving({ id: moved.id, direction });
    setErrors(null);

    try {
      for (const { image, orden } of changes) {
        await api.patch(`/products/${productId}/images/${image.id}`, { orden });
      }
    } catch (e) {
      setErrors(toApiError(e).messages);
    }

    // Al reordenarse, el botón puede perder el foco: vuelve al mismo, en su lugar nuevo.
    await refresh(moveId(moved, direction));
    movingInFlight.current = false;
    if (mounted.current) setMoving(null);
  }

  function openConfirm(image: GalleryImage, position: number) {
    // aria-disabled no frena el clic.
    if (onlyOne || moving !== null || busy[image.id] !== undefined) return;
    setConfirming({ image, position });
  }

  // Con ConfirmDialog: si falla, rechaza y el error se ve adentro del diálogo.
  async function confirmDelete() {
    if (!confirming) return;
    const { image } = confirming;
    if (!startRow(image, 'delete')) return;

    // La fila desaparece: el foco pasa al Borrar de la que ocupa su lugar, o de la anterior.
    const index = images.findIndex((item) => item.id === image.id);
    const next = images[index + 1] ?? images[index - 1];

    try {
      await api.delete(`/products/${productId}/images/${image.id}`);
    } catch (e) {
      // Se libera ya: el diálogo sigue abierto y se puede reintentar enseguida.
      releaseRow(image);
      void refresh();
      throw e;
    }
    void finishRow(image, next ? deleteId(next) : TITLE_ID);
  }

  return (
    <section aria-labelledby={TITLE_ID} className="@container mt-8 flex flex-col gap-6 border-t border-scaps-border-row pt-8">
      <div className="flex flex-col gap-1">
        {/* tabIndex -1: recibe el foco si el botón que lo tenía desaparece. */}
        <h2
          id={TITLE_ID}
          tabIndex={-1}
          className="font-display text-[1.75rem] leading-tight font-medium text-scaps-text outline-none"
        >
          Imágenes
        </h2>
        <p className="text-sm text-scaps-text-muted">Cada cambio se guarda en el momento, sin Guardar cambios.</p>
      </div>

      <ol className={listClassName}>
        {images.map((image, index) => {
          const position = index + 1;
          const action = busy[image.id];
          const locked = moving !== null || action !== undefined;
          const draft = drafts[image.id] ?? image.alt;
          const altChanged = draft.trim() !== '' && draft.trim() !== image.alt;
          const saveOff = !altChanged && action !== 'alt';

          // La acción en curso muestra que trabaja; las demás, que no se pueden usar.
          const stateClassName = (running: boolean) => (running ? 'cursor-progress' : disabledClassName);
          const movingThis = (direction: Direction) => moving?.id === image.id && moving.direction === direction;

          return (
            <li key={image.id} aria-busy={locked} className={rowClassName}>
              <div className={thumbCellClassName}>
                {/* El texto alternativo está al lado, en su campo. */}
                <ProductImage image={image} aspect="square" decorative />
                {image.es_principal && <span className={coverBadgeClassName}>Portada</span>}
              </div>

              <div className={altCellClassName}>
                <form noValidate onSubmit={(e) => saveAlt(e, image)}>
                  {/* readOnly y no disabled mientras corre una acción: así no suelta el foco. */}
                  <TextField
                    id={altId(image)}
                    label="Texto alternativo"
                    autoComplete="off"
                    maxLength={MAX_ALT_LENGTH}
                    value={draft}
                    onChange={(alt) => setDraft(image, alt)}
                    readOnly={locked}
                    error={altError(draft)}
                    action={
                      <button
                        type="submit"
                        aria-disabled={locked || !altChanged}
                        className={`${saveClassName} ${saveOff ? saveDisabledClassName : saveEnabledClassName} ${action === 'alt' ? 'cursor-progress' : ''}`}
                      >
                        {action === 'alt' && <Spinner />}
                        Guardar
                      </button>
                    }
                  />
                </form>
                {/* La única imagen no se puede borrar: el backend responde 409. */}
                {onlyOne && (
                  <p id={deleteReasonId(image)} className="text-xs text-scaps-text-muted">
                    El producto necesita al menos una imagen
                  </p>
                )}
              </div>

              {/* Solo íconos: el nombre de cada acción lo lleva el aria-label y, al pasar el mouse, el title. */}
              {/* aria-disabled y no disabled, como SubmitButton: el botón conserva el foco mientras corre. */}
              <div className={actionsCellClassName}>
                {!image.es_principal && (
                  <button
                    type="button"
                    aria-disabled={locked}
                    aria-label={`Hacer portada a la imagen ${position}`}
                    title="Hacer portada"
                    onClick={() => {
                      if (!locked) makeCover(image);
                    }}
                    className={`${actionClassName} ${stateClassName(action === 'cover')}`}
                  >
                    {action === 'cover' ? <Spinner /> : <ImageIcon className={actionIconClassName} />}
                  </button>
                )}
                <button
                  id={moveId(image, -1)}
                  type="button"
                  aria-disabled={!canMove || index === 0}
                  aria-label={`Subir imagen ${position}`}
                  title="Subir"
                  onClick={() => void move(index, -1)}
                  className={`${actionClassName} ${stateClassName(movingThis(-1))}`}
                >
                  {movingThis(-1) ? <Spinner /> : <ArrowIcon className={actionIconClassName} />}
                </button>
                <button
                  id={moveId(image, 1)}
                  type="button"
                  aria-disabled={!canMove || index === images.length - 1}
                  aria-label={`Bajar imagen ${position}`}
                  title="Bajar"
                  onClick={() => void move(index, 1)}
                  className={`${actionClassName} ${stateClassName(movingThis(1))}`}
                >
                  {movingThis(1) ? <Spinner /> : <ArrowIcon down className={actionIconClassName} />}
                </button>
                <button
                  id={deleteId(image)}
                  type="button"
                  aria-disabled={onlyOne || locked}
                  aria-label={`Borrar imagen ${position}`}
                  aria-describedby={onlyOne ? deleteReasonId(image) : undefined}
                  title="Borrar"
                  onClick={() => openConfirm(image, position)}
                  className={`${actionClassName} ${stateClassName(action === 'delete')}`}
                >
                  {action === 'delete' ? <Spinner /> : <TrashIcon className={actionIconClassName} />}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {errors && <FormAlert messages={errors} />}

      <AddImageForm
        productId={productId}
        full={full}
        onStart={() => setErrors(null)}
        onFail={setErrors}
        onSettled={() => refresh()}
      />

      <ConfirmDialog
        open={confirming !== null}
        title={`¿Borrar la imagen ${confirming?.position ?? ''}?`}
        message={
          <>
            <p>La imagen sale de la galería y no se puede recuperar.</p>
            {confirming?.image.es_principal && <p>Es la portada: pasa a serlo la primera imagen que queda.</p>}
          </>
        }
        confirmLabel="Borrar"
        onConfirm={confirmDelete}
        onClose={() => setConfirming(null)}
      />
    </section>
  );
}
