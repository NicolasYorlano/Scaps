# Deuda técnica — Scaps

Decisiones que sabemos que no son la mejor solución posible y que se tomaron así, a conciencia, para llegar al MVP.

**Toda la deuda de este archivo se salda después del MVP** (salida: 8 de octubre de 2026). Durante los sprints no se toca: el tiempo va al alcance comprometido.

Cada entrada apunta a dónde se decidió. La fuente de verdad sigue siendo ese documento; esto es el índice.

---

## Token de sesión en `localStorage`

**Hoy:** el JWT se guarda en `localStorage` y viaja en el header `Authorization`.

**Lo correcto:** cookie `httpOnly` con esquema *access + refresh*.

**Por qué no ahora:** con el frontend en Vercel y el backend en Render —dominios distintos— exige `SameSite=None`, CORS con credenciales y manejo de CSRF, y no hay dominio propio para evitarlo. El riesgo se acota con el vencimiento corto del token (2 horas) y con que la app no renderiza contenido cargado por usuarios.

**Decidido en:** [Contrato de API](contrato-api/Contrato_de_API_Scaps.md), sección 1 · backlog del Sprint 1, tarjeta *"Registro, login y datos del usuario actual"*.

---

## Los requests no se cancelan

**Hoy:** cuando una pantalla se desmonta o cambia de ruta, `useApiQuery` descarta la respuesta con un flag (`active`), pero el request sigue viajando hasta el final.

**Lo correcto:** cortarlo con `AbortController` y su `signal`.

**Por qué no ahora:** el flag ya evita el problema visible —que una respuesta vieja pise la pantalla—. Lo que queda es desperdicio de red, invisible para el usuario con respuestas JSON chicas. Donde se notaría es en el catálogo, si la búsqueda consulta la API mientras se tipea.

**Dos trampas para cuando se implemente:**

- Un request abortado entra por el `catch` del `fetch` en `apps/web/src/lib/api.ts`, que hoy traduce todo a *"No se pudo conectar con el servidor"*. Sin detectar el `AbortError`, navegar entre pantallas va a mostrar un error de conexión falso.
- Cancelar no es poner un timeout. Render tarda entre 30 y 60 segundos en despertar: un corte por tiempo rompería la primera llamada del día.

**Decidido en:** revisión del cliente HTTP del frontend (Sprint 1).
