import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Como PrismaModule, no es @Global(): lo importa cada módulo que habla con R2
// (subidas y, para borrar el archivo de una imagen, productos).
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
