import {
  BadRequestException,
  Catch,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

// Pasado limits.fileSize, el interceptor responde por su cuenta 413 "File too
// large", en inglés. El contrato responde 400 a todo request inválido y el
// frontend muestra el mensaje tal cual, así que se cambia por un 400 que dice
// el tope en castellano. Va uno en cada endpoint, porque cada uno tiene el suyo.
@Catch(PayloadTooLargeException)
export class FileTooLargeFilter implements ExceptionFilter {
  constructor(private readonly message: string) {}

  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const error = new BadRequestException(this.message); /* 400 */
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.getStatus())
      .json(error.getResponse());
  }
}
