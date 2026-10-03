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

**Hoy:** `useApiQuery` es un hook propio de ~50 líneas construido sobre `fetch`, y le faltan dos cosas.

- **No cancela.** Cuando una pantalla se desmonta o cambia de ruta, descarta la respuesta con un flag (`active`) pero el request sigue viajando hasta el final. El flag evita la *race condition* visible —que una respuesta vieja pise la pantalla—; lo que queda es desperdicio de red.
- **No gestiona el estado del servidor.** Sin caché: solo el catálogo recuerda su última respuesta (opción `keep`), para verse al instante al volver de una ficha, y aun así la vuelve a pedir; el resto de las pantallas pide todo de nuevo. Sin reintentos automáticos ante un fallo puntual —lo que en Render, que tarda entre 30 y 60 segundos en despertar, es justo lo que más se nota— y sin deduplicación, así que dos componentes que piden el mismo dato disparan dos requests.

**Lo correcto:** migrar la capa de red a [TanStack Query](https://tanstack.com/query). Resuelve la cancelación por su cuenta —le pasa un `signal` a la función de fetch— y encima suma caché, reintentos y deduplicación, que es lo que un hook propio no va a cubrir sin volverse una librería en miniatura. Si se hace esto, **el parche de abajo deja de tener sentido**: no hay que implementarlo.

**Parche, si hace falta antes:** `AbortController` y su `signal` dentro del `useEffect` de `useApiQuery`. Cubre solo la cancelación, no el resto. Es la solución barata si el problema aprieta antes de que haya tiempo para la migración.

**Por qué no ahora:** lo que falta no produce un bug visible, y las dos salidas son caras en el momento equivocado. TanStack es una dependencia nueva y el plan fija *stack mínimo* (principio 5: solo entra la tecnología que aporta un valor claro), así que su adopción es una decisión de equipo, no un detalle de implementación; además obliga a tocar todas las pantallas que ya consumen el hook.

**Dos trampas, valen para las dos salidas:**

- Un request abortado entra por el `catch` del `fetch` en `apps/web/src/lib/api.ts`, que hoy traduce todo a *"No se pudo conectar con el servidor"*. Sin detectar el `AbortError`, navegar entre pantallas va a mostrar un error de conexión falso.
- Cancelar no es poner un timeout. Render tarda entre 30 y 60 segundos en despertar: un corte por tiempo rompería la primera llamada del día.

**Decidido en:** revisión del cliente HTTP del frontend (Sprint 1).

---

## API sin rate limiting

**Hoy:** ningún endpoint limita cuántas peticiones acepta de un mismo cliente. `POST /auth/login` y `POST /auth/register` se pueden llamar sin tope.

**Lo correcto:** [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting), con un límite global holgado y uno más estricto sobre los endpoints de autenticación.

**Por qué no ahora:** hasta la salida a producción no hay tráfico real —el consumo es el del equipo y el de la demo—, así que el límite no protegería de nada y suma una dependencia, en contra del principio de stack mínimo del plan. Mientras tanto el riesgo queda acotado: la fuerza bruta contra una clave choca con el mínimo de 8 caracteres y con el costo del hash (bcrypt en 10 rondas, ~75 ms por intento, unos 13 por segundo), y la enumeración de emails ya está cerrada por los dos canales —el mensaje de error es idéntico para email inexistente y clave incorrecta, y desde el arreglo del hash de descarte el tiempo de respuesta también—.

**Decidido en:** revisión de la tarjeta *"[auth] Registro, login y datos del usuario actual"* (Sprint 1).

---

## Sin inicio de sesión con Google

**Hoy:** la única forma de entrar es email y contraseña contra nuestra base. No hay login con proveedores externos.

**Lo correcto:** sumar *"Ingresá con Google"* mediante **OpenID Connect** (la capa de identidad sobre OAuth 2.0; OAuth solo autoriza, no autentica). El backend valida el `id_token` que firma Google y, a partir de ahí, emite **nuestro** JWT como hasta ahora: el resto de la autenticación —guards, `@Roles`, `GET /auth/me`— no cambia.

**Por qué no ahora:** no está en el contrato de API ni en el alcance comprometido del MVP, y no es un agregado aislado: `Usuario.password` es obligatorio en el esquema y una cuenta de Google no tiene contraseña, así que pide migración. Además hay que decidir qué pasa cuando un email ya registrado con contraseña entra por Google —unir las cuentas exige verificar `email_verified`, o se abre un robo de cuenta— y eso es una decisión de producto, no un detalle de implementación.

**Decidido en:** consulta sobre el alcance de la autenticación, septiembre de 2026.

---

## Sin restablecimiento de contraseña

**Hoy:** quien olvida su contraseña no puede recuperar la cuenta. No hay endpoint, pantalla ni envío de emails, y el login no ofrece *"¿Olvidaste tu contraseña?"*: la única salida es registrarse de nuevo con otro email. La excepción es el admin, porque `npm run seed` vuelve a sincronizar su contraseña con `ADMIN_PASSWORD` (y, de paso, devuelve los productos de demo a sus valores del seed).

**Lo correcto:** restablecimiento por email, en dos pasos. `POST /auth/forgot-password` recibe el email y, si la cuenta existe, envía un enlace con un token aleatorio de un solo uso y vencimiento corto, del que la base guarda solo el hash. `POST /auth/reset-password` recibe ese token y la contraseña nueva, y lo consume. En el frontend, el enlace en el login y dos pantallas: pedir el enlace y elegir la contraseña nueva.

**Por qué no ahora:** no está en el contrato de API ni en el alcance comprometido del MVP, y no es un agregado aislado: exige enviar emails. Eso pide un proveedor de correo transaccional —una dependencia nueva, en contra del principio de stack mínimo del plan— y un dominio propio para que esos correos no terminen en spam, que hoy no hay. Mientras la tienda sea una demo sin checkout ni órdenes, lo único que se pierde con una cuenta es su carrito.

**Tres trampas:**

- `forgot-password` tiene que responder igual, en texto y en tiempo, exista o no el email. Si no, reabre la enumeración de cuentas que el login ya cerró.
- Depende de la entrada *API sin rate limiting*: un endpoint que envía emails sin tope sirve para inundar una casilla ajena y agotar la cuota del proveedor.
- Cambiar la contraseña no cierra las sesiones abiertas: el JWT no tiene estado en el servidor, así que un token ya emitido sigue valiendo hasta su vencimiento (2 horas).

**Decidido en:** revisión de UX de las pantallas de login y registro, octubre de 2026.
