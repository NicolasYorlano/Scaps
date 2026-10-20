import {
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileTooLargeFilter } from './file-too-large.filter';
import type { IncomingFile } from './incoming-file';
import {
  MAX_IMAGE_SIZE,
  MAX_MODEL_SIZE,
  UploadsService,
  formatSize,
  type UploadResponse,
} from './uploads.service';

// @Roles en la clase protege las dos rutas, y los guards corren antes que el
// interceptor: sin token, el archivo ni se lee.
//
// El tope va en limits.fileSize del interceptor, no en un validador como
// MaxFileSizeValidator: ese recibe primero los megas enteros en memoria y
// recién ahí los rechaza; con el límite, la lectura se corta apenas se pasa.
// Sin storage configurado, multer guarda el archivo en memoria y de ahí va a R2.
//
// El +1 es porque busboy corta cuando el archivo llega al límite, no cuando lo
// pasa: sin él, una imagen de 2 MB justos, que entra en "hasta 2 MB", rebotaría.
@Controller('uploads')
@Roles('admin')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('model')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_MODEL_SIZE + 1 } }),
  )
  @UseFilters(
    new FileTooLargeFilter(
      `El modelo supera los ${formatSize(MAX_MODEL_SIZE)}`,
    ),
  )
  uploadModel(
    @UploadedFile() file: IncomingFile | undefined,
  ): Promise<UploadResponse> {
    return this.uploads.uploadModel(file);
  }

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE + 1 } }),
  )
  @UseFilters(
    new FileTooLargeFilter(
      `La imagen supera los ${formatSize(MAX_IMAGE_SIZE)}`,
    ),
  )
  uploadImage(
    @UploadedFile() file: IncomingFile | undefined,
  ): Promise<UploadResponse> {
    return this.uploads.uploadImage(file);
  }
}
