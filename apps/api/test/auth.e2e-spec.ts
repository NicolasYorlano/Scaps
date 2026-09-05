import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import type { AuthResult } from './../src/auth/auth.service';
import { PrismaService } from './../src/prisma/prisma.service';

const EMAIL = 'e2e-auth@scaps.dev';
const PASSWORD = 'una-clave-segura';
// Se limpia igual aunque nunca deba crearse: sin ValidationPipe, se crea.
const REJECTED_EMAIL = 'e2e-rechazado@scaps.dev';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // Lo llena el login y lo usa el caso de admin.
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Copia de la config de main.ts, que createNestApplication no aplica: si
    // cambia allá, cambiarla acá o el test prueba otra app.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Al empezar y no al terminar: una corrida cortada a la mitad dejaría el
    // email ocupado y el registro daría 409. Por email, no la tabla entera.
    prisma = app.get(PrismaService);
    await prisma.usuario.deleteMany({
      where: { email: { in: [EMAIL, REJECTED_EMAIL] } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un usuario nuevo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD, nombre: 'Test', apellido: 'E2E' })
      .expect(201);

    // Tipado contra el contrato: si AuthResult cambia, esto deja de compilar.
    const body = res.body as AuthResult;
    expect(body.user).toMatchObject({ email: EMAIL, es_admin: false });
    // El contrato: password no aparece en ninguna respuesta.
    expect(body.user).not.toHaveProperty('password');
    expect(typeof body.token).toBe('string');
  });

  // El único caso que ejercita el ValidationPipe: sin esa copia de arriba, 201.
  it('rechaza un registro que no cumple el DTO', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: REJECTED_EMAIL, password: '12345', nombre: 'Test', apellido: 'E2E' })
      .expect(400); // El mínimo son 8 caracteres.
  });

  it('inicia sesión con la clave correcta', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200); // 200 y no 201: iniciar sesión no crea ningún recurso.

    const body = res.body as AuthResult;
    expect(body.user.email).toBe(EMAIL);
    token = body.token;
  });

  it('rechaza la clave incorrecta', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'clave-incorrecta' })
      .expect(401);
  });

  it('rechaza una ruta protegida sin token', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  // Cuando exista GET /admin/products, este caso pasa a esa ruta.
  it('rechaza una ruta de admin con un usuario común', () => {
    return request(app.getHttpServer())
      .get('/api/auth/admin-check')
      .set('Authorization', `Bearer ${token}`)
      .expect(403); // 403 y no 401: el token es válido, lo que falta es el permiso.
  });
});
