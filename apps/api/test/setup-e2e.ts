// Apunta Prisma a la base de test. Va en setupFiles: más tarde, el PrismaClient
// ya estaría creado con la otra URL. Apuntar mal no da un test en rojo, vacía la
// base de desarrollo: de ahí las dos guardas.

const testUrl = process.env.DATABASE_URL_TEST;

if (!testUrl) {
  throw new Error(
    'Falta DATABASE_URL_TEST: los tests e2e necesitan una base propia.\n' +
      'Es una rama del proyecto de Neon que ya tenés, no un proyecto nuevo ' +
      '(ver "Base de datos" en el README).',
  );
}

// El error fácil de cometer, y el único que la guarda de arriba no ve.
if (testUrl === process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL_TEST apunta a la misma base que DATABASE_URL. Correr así ' +
      'borraría tus datos de desarrollo.',
  );
}

process.env.DATABASE_URL = testUrl;
