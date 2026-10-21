import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import FileField from '../components/FileField';
import FormAlert from '../components/FormAlert';
import ProductFields from '../components/ProductFields';
import ProductImage from '../components/ProductImage';
import SubmitButton from '../components/SubmitButton';
import TextField from '../components/TextField';
import { useApiAction } from '../hooks/useApi';
import { api, sentence, toApiError } from '../lib/api';
import { focusField } from '../lib/forms';
import { panelNoticeState } from '../lib/panel-notice';
import { MAX_ALT_LENGTH, MAX_IMAGES, altError } from '../lib/product-images';
import { productFieldsInput, validateProductFields, type ProductFieldsInput } from '../lib/product-fields';
import { uploadImage, uploadModel } from '../lib/uploads';
import type { ProductDetail } from '../types/product';

const MODEL_ID = 'product-modelo';
const IMAGES_ID = 'product-imagenes';

const PANEL_PATH = '/admin';

const secondaryButtonClassName =
  'flex items-center justify-center rounded-scaps border border-scaps-border-input text-sm font-medium whitespace-nowrap text-scaps-text-secondary transition-colors hover:border-scaps-border-primary hover:bg-scaps-card-highlight hover:text-scaps-text-on-primary';
// Mientras se guarda, Cancelar queda apagado, como en ConfirmDialog.
const cancelClassName = `${secondaryButtonClassName} h-12 px-6 aria-disabled:cursor-not-allowed aria-disabled:border-scaps-border aria-disabled:text-scaps-text-annotation aria-disabled:hover:border-scaps-border aria-disabled:hover:bg-transparent aria-disabled:hover:text-scaps-text-annotation`;
// Quitar, en el rojo de las acciones que sacan algo (como Borrar en la galería).
const removeClassName =
  'flex h-11 items-center justify-center rounded-scaps border border-scaps-danger/60 px-4 text-sm font-medium whitespace-nowrap text-scaps-danger transition-colors hover:border-scaps-danger hover:bg-scaps-danger/10 disabled:cursor-not-allowed disabled:border-scaps-border disabled:text-scaps-text-annotation disabled:hover:border-scaps-border disabled:hover:bg-transparent';

// Cada imagen:
//   celular: la vista previa y Quitar arriba; el texto alternativo y Portada abajo
//   sm: una sola fila
const imageRowClassName =
  'grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-scaps border border-scaps-border p-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto] sm:items-center';

/** El archivo elegido y, cuando ya subió, su URL: al reintentar no se vuelve a subir. */
type PickedModel = { file: File; url: string | null };

type PickedImage = {
  key: number;
  file: File;
  /** URL local para la vista previa; se libera al quitarla o al salir. */
  preview: string;
  alt: string;
  url: string | null;
};

function altId(image: PickedImage) {
  return `image-alt-${image.key}`;
}

function removeId(image: PickedImage) {
  return `image-remove-${image.key}`;
}

function overflowNotice(left: number) {
  return `Entran hasta ${MAX_IMAGES} imágenes: ${left === 1 ? 'quedó afuera 1' : `quedaron afuera ${left}`}`;
}

type CreateProductBody = {
  nombre: string;
  descripcion?: string;
  precio: string;
  stock: number;
  glb_url: string;
  imagenes: { url: string; alt: string; orden: number; es_principal: boolean }[];
};

/** Alta de un producto completo: datos, modelo 3D e imágenes, con un solo POST /products. */
export default function NuevoProducto() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<ProductFieldsInput>(() => productFieldsInput());
  const [model, setModel] = useState<PickedModel | null>(null);
  const [images, setImages] = useState<PickedImage[]>([]);
  // La portada elegida. Si se quita, pasa a serlo la primera que quede.
  const [coverChoice, setCoverChoice] = useState<number | null>(null);
  const [imagesNotice, setImagesNotice] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Qué se está haciendo: lo dice el botón. null mientras no se guarda.
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [createFailed, setCreateFailed] = useState(false);

  const create = useApiAction((body: CreateProductBody) => api.post<ProductDetail>('/products', body));

  const nextKey = useRef(0);
  // Las vistas previas vivas, para liberarlas al salir.
  const previews = useRef(new Set<string>());
  // Un doble clic no guarda dos veces: el estado no llega a cambiar entre los dos.
  const inFlight = useRef(false);
  // Si se sale a mitad del guardado, lo que falta no sigue: el producto no se crea.
  const mounted = useRef(true);

  const saving = progress !== null;
  const coverKey = images.some((image) => image.key === coverChoice) ? coverChoice : (images[0]?.key ?? null);

  useEffect(() => {
    document.title = 'Nuevo producto | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  useEffect(() => {
    mounted.current = true;
    const urls = previews.current;
    return () => {
      mounted.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Derivados: se muestran recién al intentar guardar y se van solos al corregir.
  const fieldsResult = validateProductFields(fields);
  const modelError = model === null ? 'Elegí un modelo .glb' : null;
  const imagesError = images.length === 0 ? 'Elegí al menos una imagen' : null;

  const alertMessages = uploadError ? [uploadError] : createFailed && create.error ? create.error.messages : null;

  function selectModel(files: File[]) {
    // Un archivo nuevo descarta la URL del anterior.
    setModel({ file: files[0], url: null });
  }

  function selectImages(files: File[]) {
    const added = files.slice(0, MAX_IMAGES - images.length).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { key: nextKey.current++, file, preview, alt: '', url: null };
    });
    const left = files.length - added.length;

    setImages([...images, ...added]);
    setImagesNotice(left > 0 ? overflowNotice(left) : null);
  }

  function updateAlt(key: number, alt: string) {
    setImages((prev) => prev.map((image) => (image.key === key ? { ...image, alt } : image)));
  }

  function removeImage(index: number) {
    const image = images[index];
    // El botón desaparece: el foco pasa al Quitar que queda en su lugar, o al campo si no queda ninguno.
    const next = images[index + 1] ?? images[index - 1];
    focusField(next ? removeId(next) : IMAGES_ID);

    URL.revokeObjectURL(image.preview);
    previews.current.delete(image.preview);
    setImages(images.filter((item) => item.key !== image.key));
    setImagesNotice(null);
  }

  function failUpload(file: File, error: unknown) {
    setUploadError(`No se pudo subir ${file.name}. ${sentence(toApiError(error).message)}`);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return; // el botón usa aria-disabled, que no frena el envío

    setSubmitAttempted(true);
    setUploadError(null);
    setCreateFailed(false);

    // Primero se valida todo, sin llamar a la API. El foco va al primer error, en el orden de la pantalla.
    const firstInvalid =
      fieldsResult.firstInvalid ??
      (modelError ? MODEL_ID : null) ??
      (imagesError ? IMAGES_ID : null) ??
      images.filter((image) => altError(image.alt)).map(altId)[0] ??
      null;
    if (firstInvalid || !fieldsResult.values || !model) {
      if (firstInvalid) focusField(firstInvalid);
      return;
    }

    inFlight.current = true;
    const { descripcion, ...values } = fieldsResult.values;

    try {
      // De a uno, así el aviso dice qué archivo falló y el reintento sube solo los que faltan.
      let glbUrl = model.url;
      if (glbUrl === null) {
        setProgress('Subiendo el modelo…');
        try {
          glbUrl = await uploadModel(model.file);
        } catch (error) {
          failUpload(model.file, error);
          return;
        }
        if (!mounted.current) return;
        const url = glbUrl;
        setModel((prev) => (prev?.file === model.file ? { ...prev, url } : prev));
      }

      const imagenes: CreateProductBody['imagenes'] = [];
      for (const [index, image] of images.entries()) {
        let url = image.url;
        if (url === null) {
          setProgress(`Subiendo imagen ${index + 1} de ${images.length}…`);
          try {
            url = await uploadImage(image.file);
          } catch (error) {
            failUpload(image.file, error);
            return;
          }
          if (!mounted.current) return;
          const uploaded = url;
          setImages((prev) => prev.map((item) => (item.key === image.key ? { ...item, url: uploaded } : item)));
        }
        // El orden de la galería es el de la lista, desde 0.
        imagenes.push({ url, alt: image.alt.trim(), orden: index, es_principal: image.key === coverKey });
      }

      setProgress('Creando producto…');
      // Sin descripción, no se manda.
      const product = await create.run({
        ...values,
        ...(descripcion !== null && { descripcion }),
        glb_url: glbUrl,
        imagenes,
      });
      if (!mounted.current) return;
      if (product) {
        void navigate(PANEL_PATH, { state: panelNoticeState('Producto creado') });
      } else {
        setCreateFailed(true);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setProgress(null);
    }
  }

  function handleCancel(e: MouseEvent<HTMLAnchorElement>) {
    // aria-disabled no frena el clic: mientras se guarda, no se sale a mitad.
    if (saving) e.preventDefault();
  }

  return (
    <main className="flex flex-1 justify-center bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12">
      <div className="h-fit w-full max-w-180 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8">
        <h1 className="font-display text-heading text-scaps-text">Nuevo producto</h1>

        {/* noValidate: los avisos los da el formulario, no el globo del navegador. */}
        <form noValidate className="mt-6 flex flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
          {/* Deshabilitado mientras se guarda. El botón queda afuera: con aria-disabled conserva el foco. */}
          <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
            <ProductFields value={fields} onChange={setFields} submitAttempted={submitAttempted} />

            <div className="flex flex-col gap-2">
              <FileField
                id={MODEL_ID}
                label="Modelo 3D"
                kind="model"
                onSelect={selectModel}
                hint="Comprimido con Draco, hasta 20 MB"
                error={submitAttempted ? modelError : null}
                disabled={saving}
              />
              {model && <p className="text-sm wrap-break-word text-scaps-text">{model.file.name}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <FileField
                id={IMAGES_ID}
                label="Imágenes"
                kind="image"
                multiple
                onSelect={selectImages}
                error={(submitAttempted ? imagesError : null) ?? imagesNotice}
                disabled={saving}
              />

              {images.length > 0 && (
                <ol className="flex flex-col gap-3">
                  {images.map((image, index) => (
                    <li key={image.key} className={imageRowClassName}>
                      <div className="col-start-1 row-start-1">
                        <ProductImage image={{ url: image.preview, alt: '' }} aspect="square" decorative />
                      </div>

                      <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                        <TextField
                          id={altId(image)}
                          label="Texto alternativo"
                          autoComplete="off"
                          maxLength={MAX_ALT_LENGTH}
                          value={image.alt}
                          onChange={(alt) => updateAlt(image.key, alt)}
                          error={submitAttempted ? altError(image.alt) : null}
                        />
                      </div>

                      {/* Exactamente una portada: un grupo de radios con el mismo name. */}
                      <label className="col-span-2 row-start-3 flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm text-scaps-text-secondary sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:self-center">
                        <span className="relative inline-flex h-4 w-4 shrink-0">
                          <input
                            type="radio"
                            name="product-portada"
                            checked={image.key === coverKey}
                            onChange={() => setCoverChoice(image.key)}
                            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          />
                          {/* El input es invisible: el foco del teclado se dibuja en el círculo, como en Checkbox. */}
                          <span className="pointer-events-none absolute inset-0 rounded-full border border-scaps-border-input bg-scaps-sunken transition-colors peer-checked:border-scaps-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-scaps-text" />
                          <span className="pointer-events-none absolute inset-1 hidden rounded-full bg-scaps-text peer-checked:block" />
                        </span>
                        Portada
                      </label>

                      <button
                        id={removeId(image)}
                        type="button"
                        aria-label={`Quitar imagen ${index + 1}`}
                        onClick={() => removeImage(index)}
                        className={`${removeClassName} col-start-2 row-start-1 justify-self-end sm:col-start-4`}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </fieldset>

          {alertMessages && <FormAlert messages={alertMessages} />}

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton loading={saving} loadingLabel={progress ?? ''}>
              Crear producto
            </SubmitButton>
            <Link to={PANEL_PATH} aria-disabled={saving} onClick={handleCancel} className={cancelClassName}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
