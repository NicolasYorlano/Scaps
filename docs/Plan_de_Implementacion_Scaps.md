# Plan de Implementación — Scaps

### E-commerce de gorras con visor de productos en 3D

**Equipo (Comisión S31):** Nicolás Yorlano · Pablo Alessandrini Flores · Gonzalo Lorenzo · Mauro Casale
**Repositorio:** https://github.com/NicolasYorlano/Scaps
**Salida a producción:** 8 de octubre de 2026
**Ejecución:** sprints de 2 semanas (15 de junio – 8 de octubre de 2026)

---

## 1. Resumen ejecutivo

Scaps es un e-commerce de una marca de gorras que proyecta ampliar su catálogo (a futuro: pilusos, pasamontañas, boinas, viseras, etc). El plan construye una **plataforma que escala a múltiples productos** desde el inicio, aunque hoy la marca tenga unos pocos modelos, y suma un **visor de productos en 3D interactivo** como rasgo distintivo.

El objetivo es salir a producción el 8 de octubre con un MVP **de nivel de producción**: no un prototipo que funciona en la demo, sino software sólido en seguridad, pagos, manejo de errores y pruebas.

Dos definiciones de alcance ordenan el proyecto:

- **El visor 3D es solo de visualización** en esta etapa (rotar el producto, sin personalizar). En la ficha de cada producto se ven imágenes y hay una opción para verlo en 3D. La personalización (accesorios, color/material, packaging) queda para una segunda etapa, con la arquitectura preparada para incorporarla sin reescribir.
- **Catálogo con productos de demo:** los productos son ficticios y sus modelos 3D salen de un banco libre, lo que evita depender de modelar o conseguir gorras reales. La plataforma está diseñada para cargar productos reales más adelante sin cambios estructurales.

El cronograma deja el MVP funcional terminado a comienzos de septiembre y reserva las semanas siguientes para endurecimiento, QA y contingencia. La prioridad es la **calidad de lo entregado**, no sumar funciones.

---

## 2. Principios del plan

1. **Construir para N productos, mostrar con productos de demo.** La plataforma soporta múltiples productos; para la demo se cargan productos ficticios con modelos de un banco libre, y queda diseñada para cargar productos reales más adelante sin cambios estructurales.
2. **Nivel de producción, no prototipo.** Todo lo que entra al MVP se construye con estándar de producción: seguridad real en autenticación y pagos, validaciones, manejo de errores y pruebas de los caminos críticos (detalle en la Sección 10).
3. **Alcance bloqueado, tiempo a la calidad.** El MVP está cerrado; el margen del cronograma va a QA, endurecimiento y contingencia, no a funciones nuevas. Sumar features reintroduce riesgo.
4. **Frentes en paralelo.** Backend y frontend avanzan en simultáneo desde el Sprint 1, trabajando contra un contrato de API definido temprano.
5. **Stack mínimo.** El equipo es chico: se incorpora solo la tecnología que aporta un valor claro y se evitan herramientas que sumen complejidad sin necesidad. Ante la duda entre dos opciones, gana la más simple de operar.

---

## 3. Stack tecnológico

Prioriza un único lenguaje (TypeScript) de punta a punta.

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | React + Vite + TypeScript | — |
| 3D | React Three Fiber (R3F) + drei, sobre Three.js | Visor de solo visualización: cargar un modelo y rotarlo. |
| Estilos | Tailwind CSS | Maquetado veloz. |
| Estado | Zustand | — |
| Backend | NestJS | Implementación propia. Mismo lenguaje (TypeScript) que el frontend. |
| Base de datos | PostgreSQL | Gestionada en Neon, plan gratuito. Un proyecto para producción y uno de desarrollo por integrante, para aislar los cupos. |
| ORM | Prisma | Tipado de punta a punta y migraciones simples. |
| Autenticación | JWT + roles | Implementación propia en NestJS (guards + DTOs). |
| Pagos | Mercado Pago Checkout Pro | Estándar en Argentina; versión por redirección. |
| Modelos 3D e imágenes | `.glb` de un banco libre (CC0 y/o CC BY 4.0) + imágenes, en Cloudflare R2 | Comprimir los `.glb` con Draco. Los modelos CC BY requieren atribución (registrada en `docs/glb/Creditos_Modelos_3D_Scaps.pdf`). |
| Hosting frontend | Vercel | Deploy automático al hacer push (función nativa de Vercel, sin pipeline de CI/CD). |
| Hosting backend | Render | Plan gratuito: el servicio se duerme tras 15 min sin tráfico y tarda entre 30 y 60 s en despertar. |
| Gestión de tareas | GitHub Projects | Integrado con issues y Pull Requests. |

---

## 4. Arquitectura

Scaps combina una **landing inmersiva con un catálogo clásico**, bajo un **navbar persistente** (logo + navegación). Las vistas son:

- **Landing:** al entrar, un visor 3D muestra el producto destacado (configurable por el administrador), que el usuario puede rotar. Un llamado a la acción claro (**Ver catálogo**) lleva a explorar el resto de los productos.
- **Catálogo:** vista clásica en **cards**, con búsqueda, filtros y ordenamiento (por precio, nombre, etc.). Al seleccionar una card se abre la ficha del producto.
- **Ficha de producto:** muestra la **galería de imágenes** del producto y un botón **Ver en 3D**; al tocarlo se abre el visor 3D de ese producto (rotarlo). El 3D es una opción, no la vista por defecto.
- **Carrito y checkout:** el checkout captura la **dirección de envío**; propone la dirección principal del usuario, que puede confirmar o editar.
- **Mis direcciones:** libreta donde el usuario gestiona sus direcciones de envío (puede tener varias, con una marcada como principal).
- **Login** (página propia) y **Dashboard administrativo**.

```
NAVBAR persistente (logo + navegación)
  ├─ Landing  → Visor 3D del producto destacado (rotar) + CTA "Ver catálogo"
  ├─ Catálogo → Cards (buscar · filtrar · ordenar) → Ficha (galería de imágenes)
  │       └─ opción "Ver en 3D" → Visor 3D del producto
  ├─ Carrito → Checkout (dirección de envío)
  ├─ Mis direcciones (libreta del usuario)
  ├─ Login
  └─ Dashboard admin (CRUD · órdenes · marcar destacado)

FRONTEND (React + Vite — Vercel)
        │  REST + JWT
BACKEND (NestJS)
  Auth · Productos · Direcciones · Carrito · Órdenes · Stock · Métricas
        │
   PostgreSQL   +   Mercado Pago (checkout + webhook de confirmación)
   Cloudflare R2: imágenes y modelos .glb (el navegador los pide directo por URL)
```

El catálogo en cards y las fichas de producto son HTML estándar y, por lo tanto, indexables. Solo el visor 3D de la landing tiene posicionamiento (SEO) limitado, y no es un bloqueante: el alcance excluye derivar tráfico desde redes sociales.

**Estructura del repositorio y despliegue.** El proyecto es un **monorepo**: un único repositorio con el frontend y el backend adentro. Esto es independiente del despliegue —el código vive junto, pero cada capa se despliega por separado, porque en ejecución son cosas distintas: el frontend compila a archivos estáticos (ideales para un CDN como Vercel) y el backend es un proceso persistente (Render). Se apunta cada plataforma a su carpeta dentro del repositorio.

```
scaps/
├─ apps/
│  ├─ web/   → React + Vite   (Vercel)
│  └─ api/   → NestJS         (Render)
├─ docs/               (ERD, contrato de API, wireframes, backlogs de sprint, modelos .glb)
├─ package.json        (workspaces: ["apps/*"])
└─ config raíz         (ESLint, Prettier, .gitignore)
```

Para un equipo chico alcanza con **npm workspaces** (viene con Node, sin nada nuevo que instalar ni aprender); no se incorporan herramientas de monorepo como Turborepo o Nx. La única configuración extra de separar los despliegues es el **CORS** en el backend (definir qué orígenes acepta), que es menor y está muy documentado.

---

## 5. Metodología de trabajo

- **Sprints de 2 semanas**, con planificación, revisión y retrospectiva.
- **Daily breve**, asíncrono por Discord si los horarios no coinciden.
- **Tablero en GitHub Projects:** `Backlog → To Do → In Progress → In Review → Done`.
- **Control de versiones:** rama `main` protegida y siempre desplegable; una rama por funcionalidad; Pull Request con **revisión de un compañero** antes de integrar.
- **Definición de "Hecho":** implementado, revisado, probado e integrado a `main` sin romper el despliegue.

---

## 6. Cronograma

| Sprint | Fechas | Foco | Entregables clave |
|---|---|---|---|
| **0** | 15–28 jun | Setup + POC del visor 3D | Repositorio + tooling, **modelos `.glb` de un banco libre**, modelo de datos (diagrama entidad-relación), contrato de API, wireframes. **POC: cargar un `.glb` y rotarlo.** |
| **1** | 29 jun – 12 jul | Autenticación + base del backend ‖ base del frontend | Auth con roles, CRUD de productos (API), **despliegue en Vercel/Render activo** ‖ estructura React + landing. |
| **2** | 13–26 jul | Catálogo + ficha + visor 3D ‖ datos | Catálogo en cards (búsqueda, filtros y ordenamiento), ficha de producto con galería de imágenes y opción **Ver en 3D** (visor: rotar) ‖ modelo de datos + stock. |
| **3** | 27 jul – 9 ago | Carrito + pagos | Carrito, checkout con **dirección de envío** (libreta del usuario), **Mercado Pago en entorno de pruebas**, **descuento automático de stock** al confirmarse el pago. |
| **4** | 10–23 ago | Dashboard administrativo | CRUD de productos (interfaz), listado de órdenes, **selección del producto destacado**, métricas mínimas. |
| **5** | 24 ago – 6 sep | Estabilización | Pruebas de caminos críticos (login, checkout, stock), diseño responsive, corrección de errores. → **Fin del MVP funcional.** |
| **6** | 7–20 sep | Endurecimiento de producción | Seguridad (auth, pagos, validación de entradas), performance (carga del 3D e imágenes), accesibilidad básica, documentación, carga de productos de demo. |
| **Contingencia + salida** | 21 sep – 8 oct | Margen + producción | Buffer para ajustes finales, UAT, despliegue a producción, monitoreo y preparación de la demo. **Entrega: 8/10.** |

**Puntos a tener presentes:**

- **Sprint 0 — el POC del visor es de bajo riesgo.** Cargar y rotar un modelo con R3F + drei es territorio conocido; valida el visor sin sobresaltos.
- **Sprint 3 — Mercado Pago.** Se trabaja en entorno de pruebas desde el primer día de la fase, **y ahí se queda**: la app no sale a producción real, solo se muestra la demo. El código es idéntico en los dos modos —lo único que cambia son las credenciales—, así que pasar a producción, si alguna vez hiciera falta, es cambiar dos variables de entorno. El stock se descuenta cuando Mercado Pago **confirma el pago** (vía webhook), no al presionar "pagar".
- **El MVP funcional queda listo el 6/9.** Las cinco semanas siguientes se dedican a endurecimiento, QA y contingencia.

---

## 7. Alcance del MVP

**Incluido (salida del 8 de octubre):**

- Landing con visor 3D del producto destacado (rotar) y CTA al catálogo.
- Catálogo en cards con búsqueda, filtros y ordenamiento.
- Ficha de producto con galería de imágenes y opción **Ver en 3D**.
- Autenticación con roles (administrador / usuario).
- Carrito + checkout (con **dirección de envío**) + pago con **Mercado Pago en entorno de pruebas** (flujo completo: preferencia, redirección, webhook y confirmación).
- Libreta de direcciones del usuario (varias, con una principal) para el checkout.
- Descuento automático de stock al confirmarse la compra.
- Dashboard administrativo: CRUD de productos, listado de órdenes, selección del producto destacado y métricas mínimas.
- Productos de demo ficticios (modelos de un banco libre), con la plataforma lista para cargar productos reales.

**Segunda etapa (fuera de esta entrega):**

- Personalización en 3D: accesorios, color/material y packaging.
- Métricas avanzadas en el dashboard.
- Nuevos tipos de producto (pilusos, pasamontañas, boinas, viseras).

La arquitectura se diseña para incorporar la personalización más adelante sin reescritura.

---

## 8. Organización del trabajo

El equipo trabaja con un **modelo de tareas (pull), no con roles fijos**. No se asigna un responsable por área: el trabajo vive en un backlog priorizado y cada integrante toma la tarea que sigue. Es más flexible para un equipo chico y evita la rigidez de "esta persona es la dueña de tal parte".

Para que el modelo funcione —y no derive en que las tareas fáciles se eligen y las críticas (pagos, auth, despliegue) quedan sin tomar— se apoya en pocas reglas livianas:

- **Backlog claro y en piezas chicas.** Cada tarea se redacta para completarse en pocos días, con descripción concreta y criterio de "hecho". Se agrupan por área (Auth, Catálogo, Visor 3D, Carrito, Pagos, Dashboard, Infraestructura, Setup, Documentación), lo que organiza *el trabajo* y no a *las personas*.
- **Tablero priorizado, una tarea en curso por persona.** En GitHub Projects, las tareas listas para tomar están ordenadas por prioridad. Cada uno toma de arriba hacia abajo y mantiene una sola tarea en curso hasta terminarla. Tomar siempre de las prioritarias evita que lo crítico quede para el final.
- **Lo crítico no espera a que alguien se ofrezca.** Si una tarea prioritaria no la toma nadie, se reparte por turno (round-robin) en la sincronización. Ese es el "te toca por organización": un mecanismo de reparto, no una jerarquía.
- **Coordinador rotativo (logística, no jefatura).** Cada sprint, una persona distinta mantiene el tablero al día, corre una sincronización breve (15 min, puede ser asíncrona por Discord) y hace visibles los bloqueos y las tareas críticas sin tomar. No decide sobre los demás; solo se asegura de que el trabajo se vea y fluya. Rota para que el peso sea parejo.
- **Revisión por Pull Request** (ya prevista en la metodología). Acá cumple dos funciones extra: sostiene la calidad ante niveles dispares y hace que al menos dos personas toquen cada parte, evitando que el conocimiento quede en una sola cabeza.

Una nota para un equipo chico y con disponibilidad despareja:

- **Si te trabás, avisá temprano.** Regla simple: si una tarea está frenada más de un día, se marca como bloqueada en el tablero y se pide ayuda en la sincronización. Una tarea crítica trabada en silencio es el mayor riesgo de este modelo.

---

## 9. Gestión de riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Disponibilidad de modelos 3D | Bajo | Resuelto: se usan modelos de un banco libre (CC0 y/o CC BY 4.0). Sin dependencia de modelar ni de conseguir gorras reales. Los modelos CC BY exigen atribución en la app y el README, registrada en `docs/glb/Creditos_Modelos_3D_Scaps.pdf`. |
| Integración con Mercado Pago | Alto | Checkout Pro (redirección), entorno de pruebas temprano, stock mediante webhook. |
| Sostener el nivel de producción bajo presión de tiempo | Medio | Revisión por Pull Request desde el inicio; sprint propio de endurecimiento y QA. |
| Parciales en la etapa final | Bajo-medio | La ventana de contingencia (fines de septiembre – octubre) absorbe la carga académica. |
| Crecimiento del alcance | Medio | MVP cerrado; lo nuevo va a la segunda etapa. |

**Sin dependencias externas bloqueantes:** con los modelos resueltos (banco libre) y el backend definido (NestJS), el equipo puede arrancar el Sprint 0 de inmediato.

---

## 10. Nivel de producción

Para que el entregable sea de producción y no un prototipo, lo construido debe cumplir:

- **Seguridad:** contraseñas hasheadas, control de acceso por rol, validación de entradas en el backend, secretos en variables de entorno (nunca versionados).
- **Pagos confiables:** el stock se descuenta solo con la confirmación de Mercado Pago (webhook); manejo de pagos fallidos o abandonados.
- **Robustez:** manejo de errores y estados de carga en toda la interfaz; la app no se rompe ante datos faltantes o respuestas lentas.
- **Pruebas:** cobertura de los caminos críticos (login, checkout, descuento de stock).
- **Calidad de código:** revisión por Pull Request, linter y formateo automáticos (ESLint + Prettier).
- **Experiencia:** diseño responsive, HTTPS/SSL, performance del visor 3D y de las imágenes del catálogo.
- **Documentación:** README, guía de instalación y contrato de la API.

---

## 11. Primeros pasos (Sprint 0)

El Sprint 0 es preparación: dejar el repo, el tooling y los acuerdos de diseño listos para construir. Incluye conseguir los modelos 3D, inicializar el monorepo, diseñar el modelo de datos y el contrato de la API, los wireframes y un POC del visor. **El detalle de cada tarea —con su criterio de "hecho" y sus dependencias— está en el backlog del Sprint 0** (`docs/sprints/Sprint 0/Sprint-0-Scaps.pdf`), que es la fuente de verdad para el tablero.



