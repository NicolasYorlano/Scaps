// Las subidas del panel: el alta sube el .glb y las imágenes, la edición reemplaza
// el .glb y la galería suma imágenes. Cada archivo sube antes de guardar, y al
// producto viaja su URL.
import { api } from './api';

const MB = 1024 * 1024;

// Los topes del backend (apps/api/src/uploads/uploads.service.ts).
export const MAX_MODEL_SIZE = 20 * MB;
export const MAX_IMAGE_SIZE = 2 * MB;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Lo que va en el `accept` del input: el selector de archivos muestra solo estos. */
export const MODEL_ACCEPT = '.glb';
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',');

const formatSize = (bytes: number) => `${bytes / MB} MB`;

// Las mismas reglas que el backend, para avisar sin esperar la subida.
// El backend valida igual: esto es comodidad, no seguridad.

/** El motivo por el que el archivo no sirve como modelo, o null si sirve. */
export function modelFileError(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.glb')) return `${file.name} no es un modelo .glb`;
  if (file.size === 0) return `${file.name} está vacío`;
  if (file.size > MAX_MODEL_SIZE) return `${file.name} supera los ${formatSize(MAX_MODEL_SIZE)}`;
  return null;
}

/** El motivo por el que el archivo no sirve como imagen, o null si sirve. */
export function imageFileError(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name} no es una imagen PNG, JPG o WebP`;
  if (file.size === 0) return `${file.name} está vacío`;
  if (file.size > MAX_IMAGE_SIZE) return `${file.name} supera los ${formatSize(MAX_IMAGE_SIZE)}`;
  return null;
}

type UploadResponse = { url: string };

// Sin Content-Type: api.ts manda el FormData tal cual y el navegador arma el
// multipart con su boundary.
async function upload(path: string, file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const { url } = await api.post<UploadResponse>(path, body);
  return url;
}

/** Sube un .glb y devuelve su URL. Si falla, rechaza con el ApiError. */
export function uploadModel(file: File): Promise<string> {
  return upload('/uploads/model', file);
}

/** Sube una imagen y devuelve su URL. Si falla, rechaza con el ApiError. */
export function uploadImage(file: File): Promise<string> {
  return upload('/uploads/image', file);
}
