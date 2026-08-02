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

## Optimización de peticiones asíncronas

**Hoy:** `useApiQuery` es un hook propio de ~30 líneas construido sobre `fetch`, y le faltan dos cosas.

- **No cancela.** Cuando una pantalla se desmonta o cambia de ruta, descarta la respuesta con un flag (`active`) pero el request sigue viajando hasta el final. El flag evita la *race condition* visible —que una respuesta vieja pise la pantalla—; lo que queda es desperdicio de red.
- **No gestiona el estado del servidor.** Sin caché (volver al catálogo desde una ficha vuelve a pedir todo), sin reintentos automáticos ante un fallo puntual —lo que en Render, que tarda entre 30 y 60 segundos en despertar, es justo lo que más se nota— y sin deduplicación, así que dos componentes que piden el mismo dato disparan dos requests.

**Lo correcto:** migrar la capa de red a [TanStack Query](https://tanstack.com/query). Resuelve la cancelación por su cuenta —le pasa un `signal` a la función de fetch— y encima suma caché, reintentos y deduplicación, que es lo que un hook propio no va a cubrir sin volverse una librería en miniatura. Si se hace esto, **el parche de abajo deja de tener sentido**: no hay que implementarlo.

**Parche, si hace falta antes:** `AbortController` y su `signal` dentro del `useEffect` de `useApiQuery`. Cubre solo la cancelación, no el resto. Es la solución barata si el problema aprieta antes de que haya tiempo para la migración.

**Por qué no ahora:** lo que falta no produce un bug visible, y las dos salidas son caras en el momento equivocado. TanStack es una dependencia nueva y el plan fija *stack mínimo* (principio 5: solo entra la tecnología que aporta un valor claro), así que su adopción es una decisión de equipo, no un detalle de implementación; además obliga a tocar todas las pantallas que ya consumen el hook.

**Dos trampas, valen para las dos salidas:**

- Un request abortado entra por el `catch` del `fetch` en `apps/web/src/lib/api.ts`, que hoy traduce todo a *"No se pudo conectar con el servidor"*. Sin detectar el `AbortError`, navegar entre pantallas va a mostrar un error de conexión falso.
- Cancelar no es poner un timeout. Render tarda entre 30 y 60 segundos en despertar: un corte por tiempo rompería la primera llamada del día.

**Decidido en:** revisión del cliente HTTP del frontend (Sprint 1).
