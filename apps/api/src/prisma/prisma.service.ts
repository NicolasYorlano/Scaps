import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// El cliente de Prisma envuelto como provider de Nest, para que los servicios
// lo reciban por inyección y los tests puedan reemplazarlo por un doble.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Prisma conecta solo en la primera consulta (lazy): sin esto, el primer request
  // que entre paga el costo de abrir la conexión.
  async onModuleInit() {
    await this.$connect();
  }
}
