import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

const STORAGE_VARS = [
  'STORAGE_ENDPOINT',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_BUCKET',
  'STORAGE_PUBLIC_URL',
  'STORAGE_KEY_PREFIX',
] as const;

type StorageConfig = Record<(typeof STORAGE_VARS)[number], string>;

// Se lee al levantar la app, como JWT_SECRET en AuthModule: si falta una
// variable, el arranque se corta diciendo cuál, en vez de fallar recién con la
// primera subida. STORAGE_KEY_PREFIX es la que más importa: sin ella, una
// prueba en desarrollo subiría a la carpeta de producción.
function readStorageConfig(): StorageConfig {
  const missing = STORAGE_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    const label =
      missing.length === 1
        ? 'Falta la variable de entorno'
        : 'Faltan las variables de entorno';
    throw new Error(
      `${label} ${missing.join(', ')} (ver apps/api/.env.example).`,
    );
  }
  const config = Object.fromEntries(
    STORAGE_VARS.map((name) => [name, process.env[name] as string]),
  ) as StorageConfig;

  // Sin la barra final, los archivos irían a la raíz del bucket
  // (dev3f2a….webp), que es donde están los del seed.
  if (!/^[^/]+\/$/.test(config.STORAGE_KEY_PREFIX)) {
    throw new Error(
      'STORAGE_KEY_PREFIX tiene que ser una carpeta terminada en barra, como dev/ o prod/ (ver apps/api/.env.example).',
    );
  }
  return config;
}

// El cliente de R2, en un solo lugar. R2 habla el mismo protocolo que S3, así
// que se usa el cliente oficial apuntado a la cuenta de R2.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly keyPrefix: string;

  constructor() {
    const config = readStorageConfig();
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: config.STORAGE_ACCESS_KEY,
        secretAccessKey: config.STORAGE_SECRET_KEY,
      },
    });
    this.bucket = config.STORAGE_BUCKET;
    this.publicUrl = config.STORAGE_PUBLIC_URL.replace(/\/+$/, '');
    this.keyPrefix = config.STORAGE_KEY_PREFIX;
  }

  // Guarda el archivo en la carpeta del entorno con un nombre único y devuelve
  // su URL pública. El nombre original no se usa: puede repetirse o traer
  // caracteres raros. Sin ContentType, R2 lo serviría como binario genérico.
  async upload(
    body: Buffer,
    extension: string,
    contentType: string,
  ): Promise<string> {
    const key = `${this.keyPrefix}${randomUUID()}.${extension}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      // Al log va solo el nombre y el mensaje del error, nunca las
      // credenciales ni el request firmado.
      this.logger.error(
        `No se pudo subir ${key} a R2: ${describeError(error)}`,
      );
      throw new InternalServerErrorException(
        'No se pudo guardar el archivo',
      ); /* 500 */
    }
    return `${this.publicUrl}/${key}`;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}
