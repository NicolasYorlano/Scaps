import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// No es @Global() a propósito: cada módulo que necesite base de datos lo
// importa, y el grafo de dependencias queda explícito al leerlo.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
