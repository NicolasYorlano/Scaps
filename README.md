# Scaps

E-commerce de gorras con visor de productos en 3D.

El repositorio es un **monorepo** con dos aplicaciones:

- **`apps/web`** — frontend en React + Vite + TypeScript + Tailwind
- **`apps/api`** — backend en NestJS + TypeScript

---

## Requisitos

- **Node 22.12 o superior** (el equipo trabaja con Node 24)
- **npm** — viene incluido con Node

Para ver qué versión tenés instalada:

```bash
node --version
```

---

## Instalación

```bash
git clone https://github.com/NicolasYorlano/Scaps.git
cd Scaps
npm install
```

> **Importante:** corré `npm install` desde la **raíz del repositorio**, no dentro de `apps/web` ni de `apps/api`.
> El proyecto usa npm workspaces: una sola instalación desde la raíz resuelve las dependencias de las dos aplicaciones.

---

## Variables de entorno

Cada aplicación tiene un archivo `.env.example` con las variables que usa. Para configurarlas, copiá cada uno a un `.env`:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Los archivos `.env` están ignorados por git y **nunca deben subirse al repositorio**.

La única variable que tenés que completar para desarrollar es `DATABASE_URL`, con la cadena de tu base de Neon (ver la sección siguiente). Las de Mercado Pago y almacenamiento todavía no se usan.

---

## Base de datos

Las bases corren en [Neon](https://neon.com); no se instala Postgres en ninguna máquina.

- **Desarrollo:** una base por integrante, descartable. Cada uno crea la suya.
- **Producción:** una sola compartida, `scaps-prod`. Nadie la usa desde local.

### Crear tu base de desarrollo

Se hace una sola vez.

**1.** Creá una cuenta gratuita en [neon.com](https://neon.com) (no pide tarjeta). El alta te lleva directo a la pantalla del primer proyecto: **ese proyecto es tu base de desarrollo**, no busques un botón de "crear proyecto" después.

**2.** Completá esa pantalla así:

| Campo | Valor |
|---|---|
| Project name | `scaps-dev-nico`, `scaps-dev-pablo`, `scaps-dev-gonzalo` o `scaps-dev-mauro` |
| Postgres version | **18** — siempre 18, aunque aparezca una más nueva |
| Region | La más cercana a Argentina (São Paulo si está). **No se puede cambiar después.** |
| Database name | El que viene por defecto (`neondb`) |

> La versión tiene que coincidir con la de producción y la del resto del equipo. Si se desparejan, aparecen errores que solo le pasan a uno.

**3.** En el panel de Neon, abrí **Connect to your database**, copiá la connection string con el botón **Copy snippet** y pegala en `apps/api/.env` como `DATABASE_URL`.

> Dejá el interruptor **Connection pooling apagado**. Las migraciones de Prisma no funcionan sobre la conexión pooled (la que agrega `-pooler` al host).
>
> Copiá con **Copy snippet**, no seleccionando el texto a mano: en pantalla la contraseña aparece enmascarada con asteriscos.

**4.** Creá las tablas, **desde `apps/api`**:

```bash
cd apps/api
npx prisma migrate dev
```

Para ver las tablas: `npx prisma studio` (también desde `apps/api`).

> ⚠️ La cadena incluye tu contraseña. No la pegues en el chat del equipo ni la subas al repositorio.

### Regla del equipo

La estructura de la base se cambia **únicamente** editando `apps/api/prisma/schema.prisma` y generando una migración. Nunca a mano desde el panel de Neon, pgAdmin o DBeaver: un cambio hecho a mano no queda en el repo, el resto del equipo no lo tiene y la próxima migración puede pisarlo.

Para mirar o editar **datos**, cualquier herramienta sirve.

---

## Levantar el proyecto

Cada aplicación se levanta por separado, **cada una en su propia terminal**.

### Frontend

```bash
npm run dev -w @scaps/web
```

Abrí **http://localhost:5173** — vas a ver el visor 3D con el modelo de demo, que se puede rotar con el mouse.

### Backend

```bash
npm run start:dev -w @scaps/api
```

Queda escuchando en **http://localhost:3000**.

Para comprobar que responde, abrí **http://localhost:3000/health**: tiene que devolver `{"status":"ok"}`.

---

## Otros comandos

Desde la raíz, para todo el repositorio:

| Comando | Qué hace |
|---|---|
| `npm run lint` | Revisa el código de las dos aplicaciones |
| `npm run format` | Formatea el código con Prettier |

Para una aplicación en particular:

| Comando | Qué hace |
|---|---|
| `npm run build -w @scaps/web` | Compila el frontend |
| `npm run build -w @scaps/api` | Compila el backend |
| `npm test -w @scaps/api` | Tests unitarios del backend |
| `npm run test:e2e -w @scaps/api` | Tests end-to-end del backend |

---

## Estructura

```
Scaps/
├─ apps/
│  ├─ web/    frontend (React + Vite)
│  └─ api/    backend (NestJS)
├─ docs/      documentación del proyecto
└─ package.json
```

---

## Documentación

Toda la documentación del proyecto está en [`docs/`](docs/):

- **[Plan de implementación](docs/Plan_de_Implementacion_Scaps.md)** — alcance del MVP, stack, cronograma y decisiones tomadas
- **[Contrato de la API](docs/contrato-api/Contrato_de_API_Scaps.md)** — endpoints con método, ruta, request y response
- **[Modelo de datos](docs/modelo-de-datos/)** — tablas, campos y diagrama entidad-relación
- **[Wireframes](docs/wireframes/wireframes-mvp.md)** — bocetos de las pantallas del MVP
- **[Modelos 3D](docs/glb/)** — los `.glb` de demo y sus créditos de licencia
- **[Sprints](docs/sprints/)** — backlog de cada sprint; la guía de trabajo del equipo está en el de Sprint 0

---

## Atribuciones de los modelos 3D

Los modelos usados como productos de demo tienen licencia **CC BY 4.0**, que **obliga a mostrar la atribución de cada autor** allí donde el modelo se use públicamente.

Las atribuciones **todavía no están declaradas acá** porque el conjunto de modelos no está cerrado. **Deben agregarse antes de salir a producción.** El registro de autores, fuentes y licencias está en [`docs/glb/Creditos_Modelos_3D_Scaps.pdf`](docs/glb/Creditos_Modelos_3D_Scaps.pdf).
