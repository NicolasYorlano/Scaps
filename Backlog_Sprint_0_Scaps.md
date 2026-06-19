# Backlog Sprint 0 — Scaps

Backlog del Sprint 0 con la descripción de cada tarea, para armar el tablero del Project.

Las dos secciones de abajo son las columnas del tablero: **To Do** (se pueden tomar ya) y **Backlog** (esperan una dependencia); dentro de To Do, el orden es la prioridad. Creá una tarjeta por tarea con su título y, en la descripción, *Qué hacer* y *Hecho cuando*. Los **labels** (área + prioridad) se aplican al convertir la tarjeta en issue, cuando alguien la toma —las tarjetas *draft* no aceptan labels.

Las tareas marcadas como **consulta** o **configuración** no son código ni Pull Request: son verificaciones o ajustes en GitHub.

---

## To Do — se pueden tomar ya (no dependen de nada)

### [visor-3d] Conseguir modelos `.glb` de un banco gratuito
- **Labels:** `visor-3d` · `prioridad-alta`
- **Qué hacer:** bajar modelos `.glb` con licencia libre (CC0) de un banco como Sketchfab o Poly Pizza, para el catálogo de productos de demo. Conviene que se lean como gorras (o un tipo de producto coherente) y verificar que la licencia permita el uso.
- **Hecho cuando:** hay modelos `.glb` usables en el repo (o accesibles) para el catálogo y el POC.

### [auth] Confirmar con la cátedra los requisitos de backend/auth
- **Labels:** `auth` · `prioridad-media`
- **Tipo:** consulta (no es un PR)
- **Qué hacer:** confirmar con la cátedra si hay requisitos sobre el backend o la autenticación. El equipo ya decidió construir el backend (NestJS) y la auth (JWT + roles) por su cuenta, así que es una confirmación; no bloquea.
- **Hecho cuando:** está confirmado por escrito qué pide la cátedra (si pide algo).

### [setup] Inicializar el monorepo con workspaces
- **Labels:** `setup` · `prioridad-alta`
- **Qué hacer:** crear la estructura del monorepo con npm workspaces: `apps/web` y `apps/api`. Configurar el `package.json` raíz con los workspaces (`apps/*`). Sin `packages/shared`, sin Turborepo ni Nx.
- **Hecho cuando:** la estructura existe, instalar dependencias desde la raíz resuelve todos los workspaces, y está mergeado en `main`.

### [infra] Proteger la rama main
- **Labels:** `infra` · `prioridad-alta`
- **Tipo:** configuración en GitHub (no es un PR)
- **Qué hacer:** crear una branch protection rule sobre `main`: exigir Pull Request con al menos 1 aprobación y bloquear el push directo.
- **Hecho cuando:** no se puede pushear directo a `main` y todo cambio requiere un PR aprobado.

### [setup] Diseñar el modelo de datos (ERD)
- **Labels:** `setup` · `prioridad-alta`
- **Qué hacer:** diseñar el diagrama entidad-relación con las entidades del MVP: usuarios, roles, productos (con marca de "destacado", imágenes y modelo `.glb`), stock, carrito y órdenes.
- **Hecho cuando:** hay un ERD (diagrama + descripción de entidades, campos y relaciones) acordado por el equipo y guardado en el repo (carpeta de docs).

### [setup] Definir el contrato de la API
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Modelo de datos (ERD)
- **Qué hacer:** listar los endpoints del MVP con método, ruta, request y response (productos, auth, carrito, órdenes…). Es lo que permite a front y back trabajar en paralelo contra una interfaz acordada.
- **Hecho cuando:** hay un documento con los endpoints y sus formatos, acordado por el equipo y guardado en el repo.

### [setup] Diseñar los wireframes
- **Labels:** `setup` · `prioridad-media`
- **Qué hacer:** bocetar las pantallas del MVP (sin diseño fino): landing (visor 3D del destacado + CTA al catálogo), catálogo en cards, ficha de producto (galería de imágenes + opción Ver en 3D), carrito, login y dashboard. Puede ser en Figma o incluso a mano.
- **Hecho cuando:** hay wireframes de las pantallas principales accesibles para todo el equipo.

---

## Backlog — esperan que se libere una dependencia

### [setup] Configurar ESLint + Prettier compartidos
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** reglas de ESLint y Prettier compartidas para `web` y `api` (desde la config raíz del repo). Agregar scripts de lint y formato.
- **Hecho cuando:** `lint` corre en ambos workspaces, el formateo automático funciona y las reglas están commiteadas.

### [setup] Scaffold del frontend
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** crear la app en `apps/web` con React + Vite + TypeScript y Tailwind configurado.
- **Hecho cuando:** `npm run dev` levanta la app en local y se ve una página inicial con estilos de Tailwind aplicados.

### [setup] Scaffold del backend
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** crear la app en `apps/api` con NestJS + TypeScript y un endpoint de health check.
- **Hecho cuando:** el backend levanta en local y `GET /health` responde 200.

### [infra] Variables de entorno + .env.example
- **Labels:** `infra` · `prioridad-media`
- **Depende de:** Scaffold del frontend y del backend
- **Qué hacer:** definir las variables de entorno de `web` y `api` y dejar un `.env.example` sin secretos reales. Asegurar que `.env` esté en `.gitignore`.
- **Hecho cuando:** existe `.env.example` con las claves necesarias (sin valores sensibles) y `.env` está ignorado por git.

### [documentation] README inicial
- **Labels:** `documentation` · `prioridad-media`
- **Depende de:** Inicializar el monorepo (idealmente con los scaffolds listos)
- **Qué hacer:** README con la descripción del proyecto y los pasos para levantarlo en local (requisitos, instalar, correr `web` y `api`).
- **Hecho cuando:** alguien que clona el repo puede levantarlo siguiendo solo el README.

### [visor-3d] POC del visor 3D
- **Labels:** `visor-3d` · `prioridad-alta`
- **Depende de:** Scaffold del frontend + Modelos `.glb` del banco
- **Qué hacer:** con React Three Fiber + drei, mostrar un modelo en pantalla y poder rotarlo con el mouse (OrbitControls).
- **Hecho cuando:** en local se ve el modelo `.glb` y se puede rotar con el mouse. Valida que el visor es viable.

---

*Flujo de trabajo: se toma de arriba hacia abajo en To Do, una sola tarea en curso por persona, y si te trabás más de un día marcás la tarjeta como bloqueada y pedís ayuda en la sincronización.*
