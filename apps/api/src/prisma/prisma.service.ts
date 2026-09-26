import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { isPrismaError } from './prisma-errors';

const SERIALIZABLE_ATTEMPTS = 3;

// El cliente de Prisma envuelto como provider de Nest, para que los servicios
// lo reciban por inyección y los tests puedan reemplazarlo por un doble.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Prisma conecta solo en la primera consulta (lazy): sin esto, el primer request
  // que entre paga el costo de abrir la conexión.
  async onModuleInit() {
    await this.$connect();
  }

  // Para las reglas que la base no garantiza (una sola portada, un solo destacado):
  // si dos transacciones concurrentes se pisarían, Postgres aborta una (P2034) en
  // vez de confirmar las dos. La abortada se reintenta y vuelve a leer el estado.
  async serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!isPrismaError(error, 'P2034')) {
          throw error;
        }
        if (attempt === SERIALIZABLE_ATTEMPTS) {
          throw new ConflictException('Otro cambio se hizo al mismo tiempo, probá de nuevo'); /* 409 */
        }
      }
    }
  }
}
