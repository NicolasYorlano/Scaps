import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import FileField from '../components/FileField';
import FormAlert from '../components/FormAlert';
import GalleryEditor from '../components/GalleryEditor';
import ProductFields from '../components/ProductFields';
import SubmitButton from '../components/SubmitButton';
import { useApiAction, useApiQuery } from '../hooks/useApi';
import { api, sentence, toApiError } from '../lib/api';
import { focusField } from '../lib/forms';
import {
  productFieldsInput,
  validateProductFields,
  type ProductFieldsInput,
  type ProductFieldsValues,
} from '../lib/product-fields';
import { uploadModel } from '../lib/uploads';
import type { ProductDetail } from '../types/product';

const MODEL_ID = 'product-modelo';
const CONTENT_ID = 'contenido';

const PANEL_PATH = '/admin';

const pageClassName = 'flex flex-1 justify-center bg-scaps-canvas px-6 py-8 lg:px-12 lg:py-12';
// No encontrado y error: el mensaje centrado, como en la ficha.
const messagePageClassName =
  'flex flex-1 flex-col items-center justify-center gap-4 bg-scaps-canvas px-6 py-8 text-center lg:px-12 lg:py-12';
const cardClassName = 'h-fit w-full max-w-180 rounded-scaps border border-scaps-border bg-scaps-card p-6 sm:p-8';

const backLinkClassName =
  'inline-flex min-h-11 items-center text-sm font-medium text-scaps-text-secondary underline underline-offset-4 transition-colors hover:text-scaps-text';
const primaryButtonClassName =
  'flex h-12 items-center justify-center rounded-scaps border border-scaps-border-primary px-6 text-sm font-medium text-scaps-text-on-primary transition-colors hover:bg-scaps-card-highlight';
const labelClassName = 'text-xs font-medium uppercase tracking-[0.06em] text-scaps-text-muted';

// Los carteles del listado del panel (pages/Admin.tsx).
const badgeClassName =
  'rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wider whitespace-nowrap uppercase';
const inactiveBadgeClassName = `${badgeClassName} border-scaps-border-input bg-scaps-canvas text-scaps-text-secondary`;
const featuredBadgeClassName = `${badgeClassName} border-scaps-page/15 bg-scaps-text text-scaps-page`;

/** El archivo elegido y, cuando ya subió, su URL: si falla el PATCH, al reintentar no se vuelve a subir. */
type PickedModel = { file: File; url: string | null };

type UpdateProductBody = Partial<ProductFieldsValues & { glb_url: string }>;

/** El nombre del archivo: el final de la URL. */
function fileName(url: string) {
  return url.slice(url.lastIndexOf('/') + 1);
}

/** Los campos cuyo valor, ya en el formato del contrato, es distinto del cargado. */
function changedFields(values: ProductFieldsValues, saved: ProductDetail): UpdateProductBody {
  const changes: UpdateProductBody = {};
  if (values.nombre !== saved.nombre) changes.nombre = values.nombre;
  // Borrada va como null, que es como el contrato la borra.
  if ((values.descripcion ?? '') !== (saved.descripcion ?? '')) changes.descripcion = values.descripcion;
  if (values.precio !== saved.precio) changes.precio = values.precio;
  if (values.stock !== saved.stock) changes.stock = values.stock;
  return changes;
}

type FormProps = { product: ProductDetail };

/** El formulario, con el producto ya cargado: arranca con sus valores. */
function EditForm({ product }: FormProps) {
  // Lo último guardado: contra esto se compara lo escrito. Al guardar, pasa a ser lo que devuelve el PATCH.
  const [saved, setSaved] = useState(product);
  const [fields, setFields] = useState<ProductFieldsInput>(() => productFieldsInput(product));
  const [model, setModel] = useState<PickedModel | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Qué se está haciendo: lo dice el botón. null mientras no se guarda.
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [updateFailed, setUpdateFailed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const update = useApiAction((body: UpdateProductBody) =>
    api.patch<ProductDetail>(`/products/${saved.id}`, body),
  );

  // Un doble clic no guarda dos veces: el estado no llega a cambiar entre los dos.
  const inFlight = useRef(false);
  // Si se sale a mitad del guardado, la pantalla ya no se actualiza.
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const saving = progress !== null;
  const fieldsResult = validateProductFields(fields);
  const changes = fieldsResult.values ? changedFields(fieldsResult.values, saved) : null;
  // Con un campo inválido, lo escrito ya no es lo cargado: el botón se habilita para mostrar el error.
  const dirty = model !== null || changes === null || Object.keys(changes).length > 0;

  const alertMessages = uploadError ? [uploadError] : updateFailed && update.error ? update.error.messages : null;

  function selectModel(files: File[]) {
    // Un archivo nuevo descarta la URL del anterior.
    setModel({ file: files[0], url: null });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // El botón usa aria-disabled, que no frena el envío.
    if (inFlight.current || !dirty) return;

    setSubmitAttempted(true);
    setUploadError(null);
    setUpdateFailed(false);
    setJustSaved(false);

    if (fieldsResult.firstInvalid || !changes) {
      if (fieldsResult.firstInvalid) focusField(fieldsResult.firstInvalid);
      return;
    }

    inFlight.current = true;

    try {
      // Primero el modelo nuevo, si hay: su URL viaja en el mismo PATCH.
      let glbUrl = model?.url ?? null;
      if (model && glbUrl === null) {
        setProgress('Subiendo el modelo…');
        try {
          glbUrl = await uploadModel(model.file);
        } catch (error) {
          setUploadError(`No se pudo subir ${model.file.name}. ${sentence(toApiError(error).message)}`);
          return;
        }
        if (!mounted.current) return;
        const url = glbUrl;
        setModel((prev) => (prev?.file === model.file ? { ...prev, url } : prev));
      }

      setProgress('Guardando…');
      // Solo lo que cambió.
      const product = await update.run({ ...changes, ...(glbUrl !== null && { glb_url: glbUrl }) });
      if (!mounted.current) return;
      if (product) {
        setSaved(product);
        setFields(productFieldsInput(product));
        setModel(null);
        setSubmitAttempted(false);
        setJustSaved(true);
      } else {
        setUpdateFailed(true);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setProgress(null);
    }
  }

  return (
    <div className={cardClassName}>
      <Link to={PANEL_PATH} className={`${backLinkClassName} self-start`}>
        Volver al panel
      </Link>

      {/* Lo que no se edita acá. */}
      <h1 className="mt-2 font-display text-heading wrap-break-word text-scaps-text">{saved.nombre}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-scaps-text-secondary">
        <span className="sr-only">Estado: </span>
        {saved.activo ? <span>Activo</span> : <span className={inactiveBadgeClassName}>Inactivo</span>}
        {saved.destacado && <span className={featuredBadgeClassName}>Destacado</span>}
      </p>
      <div className="mt-4 flex flex-col gap-1">
        <p className={labelClassName}>Slug</p>
        <p className="text-sm wrap-break-word text-scaps-text">{saved.slug}</p>
        <p className="text-xs text-scaps-text-muted">
          No cambia aunque cambie el nombre, así la URL de la ficha queda estable.
        </p>
      </div>

      {/* noValidate: los avisos los da el formulario, no el globo del navegador. */}
      <form noValidate className="mt-6 flex flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
        {/* Deshabilitado mientras se guarda. El botón queda afuera: con aria-disabled conserva el foco. */}
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
          <ProductFields value={fields} onChange={setFields} submitAttempted={submitAttempted} />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className={labelClassName}>Modelo 3D</p>
              <p className="text-sm wrap-break-word text-scaps-text">{fileName(saved.glb_url)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <FileField
                id={MODEL_ID}
                label="Reemplazar modelo"
                kind="model"
                onSelect={selectModel}
                hint="Comprimido con Draco, hasta 20 MB"
                disabled={saving}
              />
              {model && <p className="text-sm wrap-break-word text-scaps-text">{model.file.name}</p>}
            </div>
          </div>
        </fieldset>

        {alertMessages && <FormAlert messages={alertMessages} />}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <SubmitButton loading={saving} loadingLabel={progress ?? ''} disabled={!dirty}>
            Guardar cambios
          </SubmitButton>
          {/* Siempre montado: un lector de pantalla anuncia que se guardó. Al volver a editar, se va. */}
          <p role="status" className="text-center text-sm text-scaps-text-secondary sm:text-left">
            {justSaved && !dirty ? 'Cambios guardados' : ''}
          </p>
        </div>
      </form>

      {/* Las imágenes no van en el formulario: cada acción se guarda en el momento. */}
      <GalleryEditor productId={product.id} initialImages={product.imagenes} />
    </div>
  );
}

// Misma forma que el formulario cargado: nada salta cuando llega.
function FormSkeleton() {
  return (
    <div aria-hidden="true" className={`${cardClassName} motion-safe:animate-pulse`}>
      <div className="flex h-11 items-center">
        <div className="h-3 w-28 rounded-full bg-scaps-placeholder" />
      </div>
      <div className="mt-2 flex h-lh items-center font-display text-heading">
        <div className="h-6 w-2/3 rounded-full bg-scaps-placeholder" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-20 rounded-full bg-scaps-placeholder" />
            <div className="h-11 rounded-scaps bg-scaps-placeholder" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Edición de un producto, activo o inactivo. La ruta está protegida con RequireAdmin. */
export default function EditarProducto() {
  const { id = '' } = useParams<{ id: string }>();
  // La ruta de admin: trae también los inactivos.
  const { data, error, loading, reload } = useApiQuery<ProductDetail>(`/admin/products/${encodeURIComponent(id)}`);

  // 404: el id no existe; 400: no es un uuid. Los dos, escritos a mano en la URL.
  const notFound = error?.status === 404 || error?.status === 400;

  useEffect(() => {
    document.title = 'Editar producto | Scaps';
    return () => {
      document.title = 'Scaps';
    };
  }, []);

  function retry() {
    reload();
    // El botón desaparece al reintentar: el foco va al contenido en vez de perderse.
    focusField(CONTENT_ID, { preventScroll: true });
  }

  return (
    <main className={!loading && (notFound || error || !data) ? messagePageClassName : pageClassName}>
      {/* Siempre montado: un lector de pantalla oye la carga. Del error avisa su propio alert. */}
      <p role="status" className="sr-only">
        {loading ? 'Cargando producto…' : ''}
      </p>

      {loading ? (
        <FormSkeleton />
      ) : notFound ? (
        <>
          <h1 className="font-display text-heading text-scaps-text">Producto no encontrado</h1>
          <Link to={PANEL_PATH} className={backLinkClassName}>
            Volver al panel
          </Link>
        </>
      ) : error || !data ? (
        <>
          <p role="alert" className="text-sm text-scaps-text-secondary">
            {error?.message ?? 'No se pudo cargar el producto.'}
          </p>
          <button type="button" onClick={retry} className={primaryButtonClassName}>
            Reintentar
          </button>
        </>
      ) : (
        // Por id: otro producto arranca de cero; volver a pedir el mismo no pisa lo que se está editando.
        <EditForm key={data.id} product={data} />
      )}
    </main>
  );
}
