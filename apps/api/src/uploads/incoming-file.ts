// Lo que se usa del archivo que arma el FileInterceptor (multer, en memoria).
// El tipo completo, Express.Multer.File, viene en @types/multer, que no está
// instalado: para cuatro campos no vale la pena sumar otro paquete.
export interface IncomingFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
