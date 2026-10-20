import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import type { IncomingFile } from './incoming-file';

const MB = 1024 * 1024;
export const MAX_MODEL_SIZE = 20 * MB;
export const MAX_IMAGE_SIZE = 2 * MB;
export const formatSize = (bytes: number) => `${bytes / MB} MB`;

// Los primeros 4 bytes de un .glb siempre dicen "glTF".
const GLB_MAGIC = Buffer.from('glTF', 'latin1');

// La extensión sale del tipo, no del nombre original. Un Map y no un objeto,
// para que un tipo como "constructor" no encuentre nada en el prototipo.
const IMAGE_EXTENSIONS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);

export interface UploadResponse {
  url: string;
}

// Valida cada archivo con las reglas de su endpoint y lo manda a R2. El tope
// de tamaño no se mira acá: lo corta el interceptor, antes de leer el cuerpo.
@Injectable()
export class UploadsService {
  constructor(private readonly storage: StorageService) {}

  async uploadModel(file: IncomingFile | undefined): Promise<UploadResponse> {
    const model = requireFile(file);

    // El tipo que manda el navegador no se mira: con un .glb suele mandar
    // application/octet-stream.
    const isGlb =
      model.originalname.toLowerCase().endsWith('.glb') &&
      model.buffer.subarray(0, GLB_MAGIC.length).equals(GLB_MAGIC);
    if (!isGlb) {
      throw new BadRequestException(
        'El archivo tiene que ser un modelo .glb',
      ); /* 400 */
    }

    const url = await this.storage.upload(
      model.buffer,
      'glb',
      'model/gltf-binary',
    );
    return { url };
  }

  async uploadImage(file: IncomingFile | undefined): Promise<UploadResponse> {
    const image = requireFile(file);

    const extension = IMAGE_EXTENSIONS.get(image.mimetype);
    if (!extension) {
      throw new BadRequestException(
        'La imagen tiene que ser PNG, JPG o WebP',
      ); /* 400 */
    }

    const url = await this.storage.upload(
      image.buffer,
      extension,
      image.mimetype,
    );
    return { url };
  }
}

// Un archivo vacío cuenta como que no vino ninguno.
function requireFile(file: IncomingFile | undefined): IncomingFile {
  if (!file || file.size === 0) {
    throw new BadRequestException(
      'Falta el archivo en el campo file',
    ); /* 400 */
  }
  return file;
}
