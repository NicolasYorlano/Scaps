# Plan de Implementación — Scaps

### E-commerce de gorras con presentación de productos en 3D

**Equipo (Comisión S31):** Nicolás Yorlano · Pablo Alessandrini Flores · Gonzalo Lorenzo · Mauro Casale
**Repositorio:** https://github.com/NicolasYorlano/Scaps
**Salida a producción:** 8 de octubre de 2026
**Ejecución:** sprints de 2 semanas (15 de junio – 8 de octubre de 2026)

---

## 1. Resumen ejecutivo

Scaps es el e-commerce de una marca de gorras que proyecta ampliar su catálogo (a futuro: pilusos, pasamontañas, boinas, viseras). El plan construye una **plataforma que escala a múltiples productos** desde el inicio, aunque hoy la marca tenga un solo modelo, y su sello distintivo es la **presentación de productos en 3D interactivo**.

El objetivo es salir a producción el 8 de octubre con un MVP **de nivel de producción**: no un prototipo que funciona en la demo, sino software sólido en seguridad, pagos, manejo de errores y pruebas.

Dos definiciones de alcance ordenan el proyecto:

- **El visor 3D es solo de visualización** en esta etapa: el usuario gira el producto y pasa de uno a otro. La personalización (accesorios, color/material, packaging) queda para una segunda etapa, con la arquitectura preparada para incorporarla sin reescribir.
- **Plataforma con datos de ejemplo:** se cargan dos o tres gorras de muestra para que el catálogo, la búsqueda, los filtros y el visor luzcan sus capacidades, aunque el negocio venda un único modelo.

El cronograma deja el MVP funcional terminado a comienzos de septiembre y reserva las semanas siguientes para endurecimiento, QA y contingencia. La prioridad es la **calidad de lo entregado**, no sumar funciones.

---

## 2. Principios del plan

1. **Construir para N productos, mostrar con datos de ejemplo.** La plataforma soporta múltiples productos; se carga un set de muestra para la demo. Con un solo producto real, la interfaz no debe verse incompleta: por ejemplo, el botón de "siguiente producto" del visor se oculta si hay uno solo.
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
| 3D | React Three Fiber (R3F) + drei, sobre Three.js | Visor de solo visualización: cargar modelo, rotar y cambiar de producto. |
| Estilos | Tailwind CSS | Maquetado veloz. |
| Estado | Zustand | — |
| Backend | NestJS | Implementación propia. Mismo lenguaje (TypeScript) que el frontend. |
| Base de datos | PostgreSQL | Gestionada en Neon (o en Railway / Render). |
| ORM | Prisma | Tipado de punta a punta y migraciones simples. |
| Autenticación | JWT + roles | Implementación propia en NestJS (guards + DTOs). |
| Pagos | Mercado Pago Checkout Pro | Estándar en Argentina; versión por redirección. |
| Modelos 3D | Archivos `.glb` + Cloudflare R2 | Comprimir con Draco. |
| Hosting frontend | Vercel | Despliegue automático desde GitHub. |
| Hosting backend | Railway / Render | — |
| CI/CD | GitHub Actions | Pruebas y despliegue en cada push. |
| Gestión de tareas | GitHub Projects | Integrado con issues y Pull Requests. |

**Acelerador opcional:** para el panel administrativo se puede usar un template (Refine, React Admin o uno de Tailwind) en lugar de construirlo de cero. Es opcional y ayuda a ganar tiempo en la parte de menor prioridad.

---

## 4. Arquitectura

Scaps combina una **landing inmersiva con un catálogo clásico**, bajo un **navbar persistente** (logo + navegación). Las vistas son:

- **Landing:** al entrar, un visor 3D muestra el producto destacado (configurable por el administrador). El usuario lo gira y, con un botón, pasa al siguiente producto.
- **Catálogo:** vista clásica en **cards**, con búsqueda y filtros. Al seleccionar una card, se abre el visor 3D de ese producto. Las cards y el botón "siguiente" del visor son dos caminos complementarios para recorrer el catálogo.
- **Carrito**, **Login** (página propia) y **Dashboard administrativo**.

```
NAVBAR persistente (logo + navegación)
  ├─ Landing  → Visor 3D del producto destacado (girar · siguiente)
  ├─ Catálogo → Cards (buscar · filtrar) → clic → Visor 3D del producto
  ├─ Carrito
  ├─ Login
  └─ Dashboard admin (CRUD · órdenes · marcar destacado)

FRONTEND (React + Vite — Vercel)
        │  REST + JWT
BACKEND (NestJS)
  Auth · Productos · Carrito · Órdenes · Stock · Métricas
        │
   PostgreSQL   +   Mercado Pago (checkout + webhook de confirmación)
   Modelos .glb (visor) servidos desde CDN
```

El catálogo en cards es HTML estándar y, por lo tanto, indexable. El visor 3D de la landing tiene posicionamiento (SEO) limitado, pero no es un bloqueante: el alcance excluye derivar tráfico desde redes sociales.

**Estructura del repositorio y despliegue.** El proyecto es un **monorepo**: un único repositorio con el frontend y el backend adentro. Esto es independiente del despliegue —el código vive junto, pero cada capa se despliega por separado, porque en ejecución son cosas distintas: el frontend compila a archivos estáticos (ideales para un CDN como Vercel) y el backend es un proceso persistente (Railway o Render). Se apunta cada plataforma a su carpeta dentro del repositorio.

```
scaps/
├─ apps/
│  ├─ web/   → React + Vite   (Vercel)
│  └─ api/   → NestJS         (Railway / Render)
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
| **0** | 15–28 jun | Setup + POC del visor 3D | Repositorio + tooling + CI, **decisión de modelos 3D**, modelo de datos (diagrama entidad-relación), contrato de API, wireframes. **POC: cargar una gorra `.glb` y rotarla.** |
| **1** | 29 jun – 12 jul | Autenticación + base del backend ‖ base del frontend | Auth con roles, CRUD de productos (API), **pipeline de despliegue activo** ‖ estructura React + landing. |
| **2** | 13–26 jul | Visor 3D + catálogo ‖ datos | Visor (girar + cambiar de producto), catálogo en cards con búsqueda y filtros ‖ modelo de datos + stock. |
| **3** | 27 jul – 9 ago | Carrito + pagos | Carrito, checkout, **Mercado Pago en entorno de pruebas**, **descuento automático de stock** al confirmarse el pago. |
| **4** | 10–23 ago | Dashboard administrativo | CRUD de productos (interfaz), listado de órdenes, **selección del producto destacado**, métricas mínimas, Mercado Pago en producción. |
| **5** | 24 ago – 6 sep | Estabilización | Pruebas de caminos críticos (login, checkout, stock), diseño responsive, corrección de errores. → **Fin del MVP funcional.** |
| **6** | 7–20 sep | Endurecimiento de producción | Seguridad (auth, pagos, validación de entradas), performance (carga del 3D e imágenes), accesibilidad básica, documentación, carga de datos de ejemplo. |
| **Contingencia + salida** | 21 sep – 8 oct | Margen + producción | Buffer para parciales y ajustes, UAT, despliegue a producción, dominio + SSL, monitoreo y preparación de la demo. **Entrega: 8/10.** |

**Puntos a tener presentes:**

- **Sprint 0 — el POC del visor es de bajo riesgo.** Cargar y rotar un modelo con R3F + drei es territorio conocido; valida el visor sin sobresaltos.
- **Sprint 3 — Mercado Pago.** Trabajar en entorno de pruebas desde el primer día de la fase. El stock se descuenta cuando Mercado Pago **confirma el pago** (vía webhook), no al presionar "pagar".
- **El MVP funcional queda listo el 6/9.** Las cinco semanas siguientes se dedican a endurecimiento, QA y contingencia, y absorben la carga de parciales de septiembre y octubre.

---

## 7. Alcance del MVP

**Incluido (salida del 8 de octubre):**

- Landing con visor 3D del producto destacado (girar + cambiar de producto).
- Catálogo en cards con búsqueda y filtros.
- Autenticación con roles (administrador / usuario).
- Carrito + checkout + **pago real con Mercado Pago**.
- Descuento automático de stock al confirmarse la compra.
- Dashboard administrativo: CRUD de productos, listado de órdenes y selección del producto destacado.
- Datos de ejemplo (dos o tres gorras) para la demo.

**Segunda etapa (fuera de esta entrega):**

- Personalización en 3D: accesorios, color/material y packaging.
- Métricas avanzadas en el dashboard.
- Nuevos tipos de producto (pilusos, pasamontañas, boinas, viseras).

La arquitectura se diseña para incorporar la personalización más adelante sin reescritura.

---

## 8. Organización del trabajo

El equipo trabaja con un **modelo de tareas (pull), no con roles fijos**. No se asigna un responsable por área: el trabajo vive en un backlog priorizado y cada integrante toma la tarea que sigue. Es más flexible para un equipo chico y evita la rigidez de "esta persona es la dueña de tal parte".

Para que el modelo funcione —y no derive en que las tareas fáciles se eligen y las críticas (pagos, auth, despliegue) quedan sin tomar— se apoya en pocas reglas livianas:

- **Backlog claro y en piezas chicas.** Cada tarea se redacta para completarse en pocos días, con descripción concreta y criterio de "hecho". Se agrupan por área (Auth, Catálogo, Visor 3D, Carrito, Pagos, Dashboard, Infraestructura), lo que organiza *el trabajo* y no a *las personas*.
- **Tablero priorizado, una tarea en curso por persona.** En GitHub Projects, las tareas listas para tomar están ordenadas por prioridad. Cada uno toma de arriba hacia abajo y mantiene una sola tarea en curso hasta terminarla. Tomar siempre de las prioritarias evita que lo crítico quede para el final.
- **Lo crítico no espera a que alguien se ofrezca.** Si una tarea prioritaria no la toma nadie, se reparte por turno (round-robin) en la sincronización. Ese es el "te toca por organización": un mecanismo de reparto, no una jerarquía.
- **Coordinador rotativo (logística, no jefatura).** Cada sprint, una persona distinta mantiene el tablero al día, corre una sincronización breve (15 min, puede ser asíncrona por Discord) y hace visibles los bloqueos y las tareas críticas sin tomar. No decide sobre los demás; solo se asegura de que el trabajo se vea y fluya. Rota para que el peso sea parejo.
- **Revisión por Pull Request** (ya prevista en la metodología). Acá cumple dos funciones extra: sostiene la calidad ante niveles dispares y hace que al menos dos personas toquen cada parte, evitando que el conocimiento quede en una sola cabeza.

Dos notas para un equipo chico y con disponibilidad despareja:

- **El tablero deja registro de quién hizo qué.** No es para controlar a nadie, pero en un trabajo grupal con nota es la forma más simple de que el aporte quede visible y el reparto sea justo.
- **Si te trabás, avisá temprano.** Regla simple: si una tarea está frenada más de un día, se marca como bloqueada en el tablero y se pide ayuda en la sincronización. Una tarea crítica trabada en silencio es el mayor riesgo de este modelo.

---

## 9. Gestión de riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Origen de los modelos 3D sin definir | Alto | Decidir ya: modelar en Blender, comprar o que los provea la marca. Sigue siendo necesario aunque el visor sea solo de visualización. |
| Integración con Mercado Pago | Alto | Checkout Pro (redirección), entorno de pruebas temprano, stock mediante webhook. |
| Requisitos de la cátedra sobre auth/backend sin confirmar | Bajo | Se optó por construir el backend (NestJS) y la autenticación (JWT + roles): satisface el requisito en cualquier caso. Confirmar con la cátedra de todos modos. |
| La app se ve incompleta con un solo producto | Medio | Construir para N productos, cargar datos de ejemplo y ocultar controles que no apliquen (ej. "siguiente" con un único producto). |
| Sostener el nivel de producción bajo presión de tiempo | Medio | Revisión por Pull Request desde el inicio; sprint propio de endurecimiento y QA. |
| Parciales en la etapa final | Bajo-medio | La ventana de contingencia (fines de septiembre – octubre) absorbe la carga académica. |
| Crecimiento del alcance | Medio | MVP cerrado; lo nuevo va a la segunda etapa. |

**Definición urgente de la semana:** de dónde salen los modelos 3D. El resto del alcance está acordado.

---

## 10. Nivel de producción

Para que el entregable sea de producción y no un prototipo, lo construido debe cumplir:

- **Seguridad:** contraseñas hasheadas, control de acceso por rol, validación de entradas en el backend, secretos en variables de entorno (nunca versionados).
- **Pagos confiables:** el stock se descuenta solo con la confirmación de Mercado Pago (webhook); manejo de pagos fallidos o abandonados.
- **Robustez:** manejo de errores y estados de carga en toda la interfaz; la app no se rompe ante datos faltantes o respuestas lentas.
- **Pruebas:** cobertura de los caminos críticos (login, checkout, descuento de stock).
- **Calidad de código:** revisión por Pull Request, linter y formateo automáticos (ESLint + Prettier), integración y despliegue continuos.
- **Experiencia:** diseño responsive, HTTPS/SSL, performance del visor 3D y de las imágenes del catálogo.
- **Documentación:** README, guía de instalación y contrato de la API.

---

## 11. Primeros pasos (Sprint 0)

1. Definir el origen de los modelos 3D.
2. Confirmar los requisitos de la cátedra sobre autenticación y backend.
3. Estructurar el repositorio con ESLint, Prettier y un workflow básico de GitHub Actions.
4. Diseñar el modelo de datos: usuarios, roles, productos (con marca de destacado), stock, carrito y órdenes. **Definir si las gorras tienen variantes (color, talle, tipo) y contemplarlas desde la base de datos.**
5. Definir el contrato de la API para habilitar el trabajo en paralelo.
6. Elaborar los wireframes: landing/visor, catálogo, ficha → visor, carrito, login y dashboard.
7. Cargar el backlog del MVP en GitHub Projects junto con los datos de ejemplo.
8. Ejecutar el POC del visor: cargar una gorra `.glb` y rotarla.

---

*Documento vivo. Las prioridades que ordenan el proyecto: nivel de producción en todo lo que entra, plataforma lista para escalar, y conseguir los modelos 3D cuanto antes.*
