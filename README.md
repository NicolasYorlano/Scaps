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

## Variables de entorno

Cada aplicación tiene un archivo `.env.example` con las variables que usa. Para configurarlas, copiá cada uno a un `.env`:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Los archivos `.env` están ignorados por git y **nunca deben subirse al repositorio**.

> Hoy el proyecto levanta sin configurar nada: el backend usa el puerto 3000 por defecto y el resto de las variables todavía no se utilizan. Van a hacer falta cuando se integren la base de datos, Mercado Pago y el almacenamiento de archivos.

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

- **Plan de implementación** — alcance del MVP, stack, cronograma y decisiones tomadas
- **Contrato de la API** — endpoints con método, ruta, request y response
- **Modelo de datos** — tablas, campos y diagrama entidad-relación
- **Sprint 0** — guía de trabajo del equipo y backlog de tareas

---

## Atribuciones de los modelos 3D

Los modelos usados como productos de demo tienen licencia **CC BY 4.0**, que **obliga a mostrar la atribución de cada autor** allí donde el modelo se use públicamente.

Las atribuciones **todavía no están declaradas acá** porque el conjunto de modelos no está cerrado. **Deben agregarse antes de salir a producción.** El registro de autores, fuentes y licencias está en [`docs/glb/Creditos_Modelos_3D_Scaps.pdf`](docs/glb/Creditos_Modelos_3D_Scaps.pdf).
