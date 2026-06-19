# Backlog Sprint 0 — Scaps

Backlog del Sprint 0 con la descripción de cada tarea, para armar el tablero del Project.

Las dos secciones de abajo son las columnas del tablero: **To Do** (se pueden tomar ya) y **Backlog** (esperan una dependencia); dentro de To Do, el orden es la prioridad. Creá una tarjeta por tarea con su título y, en la descripción, *Qué hacer* y *Hecho cuando*. Los **labels** (área + prioridad) se aplican al convertir la tarjeta en issue, cuando alguien la toma —las tarjetas *draft* no aceptan labels.

Las tareas marcadas como **configuración** no son código ni Pull Request: son ajustes en GitHub.

---

## To Do — se pueden tomar ya (no dependen de nada)

### [visor-3d] Conseguir modelos `.glb` de un banco gratuito
- **Labels:** `visor-3d` · `prioridad-alta`
- **Qué hacer:** bajar 3 o 4 modelos 3D en formato `.glb` de un banco de modelos gratuitos (sitios como Sketchfab o Poly Pizza), para usarlos como productos de demo en el catálogo. Usar modelos con licencia **CC0** (uso libre, sin necesidad de atribución) y, si se puede, que parezcan gorras o un producto coherente.
- **Hecho cuando:** los archivos `.glb` están en el repo (o en una carpeta/URL accesible para el equipo) y se pueden usar en el catálogo y en el POC.

### [setup] Inicializar el monorepo con workspaces
- **Labels:** `setup` · `prioridad-alta`
- **Qué hacer:** crear la estructura base del repo: una carpeta `apps/` con dos subcarpetas, `apps/web` (frontend) y `apps/api` (backend), y un `package.json` en la raíz. En ese `package.json` raíz, agregar la clave `"workspaces": ["apps/*"]`, que le avisa a npm que las dos apps son parte del mismo repo y se instalan juntas. No usar `packages/shared` ni herramientas de monorepo como Turborepo o Nx.
- **Hecho cuando:** la estructura existe, correr `npm install` desde la raíz instala las dependencias de los dos workspaces, y está mergeado en `main`.

### [infra] Proteger la rama main
- **Labels:** `infra` · `prioridad-alta`
- **Tipo:** configuración en GitHub (no es un PR)
- **Qué hacer:** configurar en GitHub una regla de protección sobre la rama `main` para que nadie pueda hacer push directo y todo cambio entre por Pull Request. Se hace en el repo, en **Settings → Branches → Add branch ruleset** (o *Add rule*), activando "Require a pull request before merging" con al menos 1 aprobación.
- **Hecho cuando:** no se puede hacer push directo a `main`; cualquier cambio requiere un PR con al menos una aprobación.

### [setup] Diseñar el modelo de datos (ERD)
- **Labels:** `setup` · `prioridad-alta`
- **Qué hacer:** diseñar el **ERD** (diagrama entidad-relación): definir las tablas/entidades del MVP, sus campos y cómo se relacionan entre sí. Entidades: usuarios, roles, productos (con marca de "destacado", imágenes y modelo `.glb`), stock, carrito y órdenes. Se puede dibujar en una herramienta como dbdiagram.io o draw.io.
- **Hecho cuando:** hay un ERD (diagrama + descripción de entidades, campos y relaciones) acordado por el equipo y guardado en `docs/`.

### [setup] Diseñar los wireframes
- **Labels:** `setup` · `prioridad-media`
- **Qué hacer:** hacer bocetos simples (sin diseño fino, solo dónde va cada elemento) de las pantallas del MVP: landing (visor 3D del destacado + un **CTA** —botón de llamado a la acción— hacia el catálogo), catálogo en cards, ficha de producto (galería de imágenes + opción Ver en 3D), carrito, login y dashboard. Pueden ser en Figma, Excalidraw o incluso a mano y fotografiados.
- **Hecho cuando:** hay wireframes de las pantallas principales accesibles para todo el equipo (en `docs/` o un link compartido).

---

## Backlog — esperan que se libere una dependencia

### [setup] Definir el contrato de la API
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Modelo de datos (ERD)
- **Qué hacer:** listar todos los **endpoints** (las direcciones que expone la API) del MVP y, para cada uno, anotar el método (GET, POST, etc.), la ruta, qué recibe (request) y qué devuelve (response). Ejemplo: `GET /products` → devuelve la lista de productos. Cubrir productos, auth, carrito y órdenes. Esto es lo que permite que front y back trabajen en paralelo contra una interfaz acordada.
- **Hecho cuando:** hay un documento con los endpoints y sus formatos, acordado por el equipo y guardado en `docs/`.

### [setup] Configurar ESLint + Prettier compartidos
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** configurar **ESLint** (marca errores y malas prácticas en el código) y **Prettier** (formatea el código automáticamente) con reglas compartidas para `web` y `api`, definidas desde la raíz del repo. Agregar los scripts de npm para correrlos (por ejemplo `npm run lint` y `npm run format`).
- **Hecho cuando:** `lint` corre en los dos workspaces, el formateo automático funciona y las reglas están commiteadas.

### [setup] Scaffold del frontend
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** crear el proyecto base ("scaffold" = estructura inicial que ya levanta, todavía sin las pantallas reales) del frontend en `apps/web`: una app de **React + Vite + TypeScript** con **Tailwind** ya configurado. Se puede arrancar con el creador de Vite (`npm create vite@latest`).
- **Hecho cuando:** `npm run dev` levanta la app en local y se ve una página inicial con estilos de Tailwind aplicados.

### [setup] Scaffold del backend
- **Labels:** `setup` · `prioridad-alta`
- **Depende de:** Inicializar el monorepo
- **Qué hacer:** crear el proyecto base del backend en `apps/api`: una app de **NestJS + TypeScript**. Se puede arrancar con el CLI de Nest (`nest new`). Incluir un endpoint de **health check**: un `GET /health` que devuelva 200, que sirve para chequear que el servidor está vivo.
- **Hecho cuando:** el backend levanta en local y `GET /health` responde 200.

### [infra] Variables de entorno + .env.example
- **Labels:** `infra` · `prioridad-media`
- **Depende de:** Scaffold del frontend y del backend
- **Qué hacer:** definir las **variables de entorno** de `web` y `api` (la configuración que no va escrita en el código: URLs, claves, credenciales). Crear un archivo `.env.example` que liste los nombres de esas variables pero **sin los valores reales** (sirve de plantilla para que cada uno arme su propio `.env`). Asegurar que `.env` esté en el `.gitignore` para que nunca se suba al repo.
- **Hecho cuando:** existe `.env.example` con las claves necesarias (sin valores sensibles) y `.env` está ignorado por git.

### [documentation] README inicial
- **Labels:** `documentation` · `prioridad-media`
- **Depende de:** Inicializar el monorepo (idealmente con los scaffolds listos)
- **Qué hacer:** escribir el `README.md` con una descripción corta del proyecto y los pasos para levantarlo en local: requisitos (por ejemplo, la versión de Node), cómo instalar las dependencias y cómo correr `web` y `api`.
- **Hecho cuando:** alguien que clona el repo por primera vez puede levantarlo siguiendo solo el README, sin preguntar nada.

### [visor-3d] POC del visor 3D
- **Labels:** `visor-3d` · `prioridad-alta`
- **Depende de:** Scaffold del frontend + Modelos `.glb` del banco
- **Qué hacer:** hacer una **POC** (prueba de concepto: algo mínimo para validar que la idea funciona). Con **React Three Fiber + drei** (las librerías para 3D en React), cargar uno de los modelos `.glb` del banco, mostrarlo en pantalla y poder rotarlo con el mouse. Para rotar alcanza con **OrbitControls** (un helper de drei que mueve la cámara con el mouse).
- **Hecho cuando:** en local se ve el modelo `.glb` y se puede rotar con el mouse. Valida que el visor es viable.

---

*Flujo de trabajo: se toma de arriba hacia abajo en To Do, una sola tarea en curso por persona, y si te trabás más de un día marcás la tarjeta como bloqueada y pedís ayuda en la sincronización.*
