# Contrato de la API — Scaps

### E-commerce de gorras con visor de productos en 3D

Este documento lista los endpoints de la API con **método, ruta, request y response**. Es el acuerdo que permite que front y back avancen en paralelo: el frontend puede mockear estas respuestas y el backend implementarlas, sin pisarse. Las formas de los datos derivan del modelo de datos; ante cualquier duda de semántica de un campo, la fuente es `Modelo_de_Datos_Scaps`.

---

## 1. Convenciones generales

**Base URL y prefijo.** Todas las rutas cuelgan de un prefijo global `/api` (config en NestJS). En este documento las rutas se escriben relativas a ese prefijo (`/products` = `https://api.scaps.../api/products`). **Sin versionado de rutas** (`/api/v1`): el único consumidor de la API es el propio frontend, así que no hay clientes externos que se rompan ante un cambio de forma (front y back se despliegan juntos). Si en el futuro se abriera una API pública para terceros, el versionado se agrega en ese momento.

**Autenticación.** JWT en el header. Las rutas que piden sesión esperan:

```
Authorization: Bearer <token>
```

El token se obtiene en `POST /auth/login` o `POST /auth/register`. El frontend lo guarda **en memoria** (estado de Zustand, **no** `localStorage`) para bajar la superficie de robo por XSS; al recargar la página, la sesión se rehidrata con `GET /auth/me` mientras el token siga vivo. No hay logout en el servidor: al ser un JWT sin estado, cerrar sesión es descartar el token del lado del cliente. El esquema *access + refresh* queda como **deuda técnica para después del MVP**.

**Roles.** Cada endpoint indica quién puede llamarlo:

- **Público** — sin token.
- **Autenticado** — cualquier usuario logueado (token válido).
- **Admin** — usuario con `es_admin = true`. Devuelve `403` si un usuario común lo llama.

**Dinero.** Los montos (`precio`, `total`, `precio_unitario`, `subtotal`) viajan como **string decimal** (ej. `"15999.00"`), no como número, para no arrastrar los errores de redondeo del `float` de JSON. El backend usa `decimal` en la base (ver modelo de datos); el string preserva esa exactitud de punta a punta.

**Fechas.** Formato ISO 8601 en UTC (ej. `"2026-07-18T14:32:00.000Z"`).

**Paginación.** Los listados largos (catálogo, órdenes) aceptan `?page=1&limit=20` y responden con un sobre:

```json
{
  "data": [ /* ... */ ],
  "meta": { "page": 1, "limit": 20, "total": 47, "total_pages": 3 }
}
```

Los recursos que no paginan (el carrito, una ficha) devuelven el objeto directo, sin sobre.

**Formato de errores.** Se usa el estándar de NestJS:

```json
{
  "statusCode": 400,
  "message": ["email debe ser un correo válido", "password debe tener al menos 8 caracteres"],
  "error": "Bad Request"
}
```

`message` es un string o un arreglo de strings (cuando la validación de entrada falla en varios campos a la vez).

**Códigos de estado que se usan.** `200` OK · `201` creado · `204` sin contenido · `400` request inválido · `401` sin autenticar (token faltante o vencido) · `403` sin permiso (rol) · `404` no encontrado · `409` conflicto (ej. email ya registrado, stock insuficiente).

**CORS.** El backend acepta el origen del frontend (Vercel) — es la única config extra por separar los despliegues, ya prevista en el plan. No afecta las formas de este contrato.

**Nomenclatura de rutas y campos.**

- **Rutas en inglés** (`/products`, `/cart`, `/orders`).
- **Campos de los recursos en español**, igual que el modelo de datos (`nombre`, `precio`, `es_admin`, `creado_en`, `glb_url`).
- El parámetro de ordenamiento se llama **`sort`** (en inglés) a propósito, para no chocar con "orden" en el sentido de *pedido*.

---

## 2. Tabla resumen

| Endpoint (método + ruta) | Rol | Descripción |
|---|---|---|
| `POST /auth/register` | Público | Registrar un cliente |
| `POST /auth/login` | Público | Iniciar sesión |
| `GET /auth/me` | Autenticado | Datos del usuario actual |
| `GET /products` | Público | Catálogo (búsqueda, filtros, orden, paginado) |
| `GET /products/featured` | Público | Producto destacado de la landing |
| `GET /products/:slug` | Público | Ficha de un producto por slug |
| `POST /uploads/model` | Admin | Subir un `.glb`, devuelve la URL |
| `POST /uploads/image` | Admin | Subir una imagen, devuelve la URL |
| `GET /admin/products` | Admin | Listado completo (incluye inactivos) |
| `GET /admin/products/:id` | Admin | Producto por id (para editar) |
| `POST /products` | Admin | Crear producto |
| `PATCH /products/:id` | Admin | Editar producto |
| `DELETE /products/:id` | Admin | Baja lógica (`activo = false`) |
| `PUT /products/featured` | Admin | Elegir / reemplazar el destacado |
| `POST /products/:id/images` | Admin | Agregar una imagen más a la galería |
| `PATCH /products/:id/images/:imageId` | Admin | Editar una imagen |
| `DELETE /products/:id/images/:imageId` | Admin | Borrar una imagen |
| `GET /addresses` | Autenticado | Mis direcciones |
| `POST /addresses` | Autenticado | Crear dirección |
| `PATCH /addresses/:id` | Autenticado | Editar dirección |
| `DELETE /addresses/:id` | Autenticado | Borrar dirección |
| `GET /cart` | Autenticado | Mi carrito con totales |
| `POST /cart/items` | Autenticado | Agregar / sumar producto |
| `PATCH /cart/items/:id` | Autenticado | Cambiar cantidad |
| `DELETE /cart/items/:id` | Autenticado | Quitar ítem |
| `POST /orders` | Autenticado | Checkout: crear orden + preferencia MP |
| `GET /orders` | Autenticado | Mis órdenes |
| `GET /orders/:id` | Autenticado / Admin | Detalle de una orden |
| `POST /webhooks/mercadopago` | Mercado Pago | Confirmación de pago (server-to-server) |
| `GET /admin/orders` | Admin | Todas las órdenes |
| `GET /admin/metrics` | Admin | Métricas mínimas del dashboard |

---

## 3. Autenticación

### `POST /auth/register` · Público

Registra un cliente nuevo y devuelve el token para dejarlo logueado.

**Request**
```json
{
  "email": "juan@mail.com",
  "password": "una-clave-segura",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

**Response** `201`
```json
{
  "user": {
    "id": "a3f9c1e0-4b2d-...",
    "email": "juan@mail.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "telefono": null,
    "es_admin": false,
    "creado_en": "2026-07-18T14:32:00.000Z",
    "actualizado_en": "2026-07-18T14:32:00.000Z"
  },
  "token": "eyJhbGciOi..."
}
```

**Notas**
- El `telefono` no se pide en el registro, para no sumar fricción al alta; se pide en el checkout (ver modelo de datos). `es_admin` siempre arranca en `false`.
- Los administradores no se crean por la API: se cargan por *seed* (un script que inyecta las filas directamente en la base de datos).
- `409` si el email ya está registrado.
- El objeto `user` (sin `password`) es el mismo que devuelven `login` y `me`.

### `POST /auth/login` · Público

**Request**
```json
{ "email": "juan@mail.com", "password": "una-clave-segura" }
```

**Response** `200` — mismo `{ "user": {...}, "token": "..." }` que register. `401` si las credenciales no coinciden.

### `GET /auth/me` · Autenticado

Devuelve el usuario del token. Sirve para rehidratar la sesión al recargar la página.

**Response** `200` — el objeto `user` (sin `password`).

---

## 4. Productos (público)

### `GET /products` · Público

Catálogo. Devuelve **solo productos activos** en formato *card* (liviano, sin `glb_url` ni galería).

**Query params** (todos opcionales)

| Param | Ejemplo | Efecto |
|---|---|---|
| `q` | `trucker` | Búsqueda por nombre |
| `precio_min` | `5000` | Precio mínimo |
| `precio_max` | `20000` | Precio máximo |
| `en_stock` | `true` | Solo con `stock > 0` |
| `sort` | `precio_asc` | `precio_asc` · `precio_desc` · `nombre_asc` · `nombre_desc` · `recientes` (default) |
| `page` / `limit` | `1` / `20` | Paginación |

**Response** `200`
```json
{
  "data": [
    {
      "id": "…",
      "nombre": "Gorra Trucker Negra",
      "slug": "gorra-trucker-negra",
      "precio": "15999.00",
      "destacado": false,
      "imagen_principal": { "url": "https://cdn…/foto.webp", "alt": "Gorra trucker negra de frente" },
      "stock": 12
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

**Notas**
- Los filtros son acotados a propósito: no hay categorías ni variantes en el MVP, así que hoy se filtra por texto, rango de precio y disponibilidad. Se puede ampliar sin romper el contrato.
- `imagen_principal` **siempre viene presente**: todo producto tiene al menos una imagen con una marcada como principal (la portada), garantizado desde su creación (relación 1..* del modelo de datos).

### `GET /products/featured` · Público

El único producto destacado, para el visor 3D de la landing. Trae el objeto **completo** (incluye `glb_url` y galería).

**Response** `200` — objeto **Producto (detalle)**, igual al de `GET /products/:slug`.
`404` si no hay ninguno destacado.

**Notas**
- El estado "sin destacado" está tolerado pero **no es deseado**: se alcanza solo como *consecuencia* (día uno sin productos, o baja del que estaba destacado), nunca a propósito. El backend **no auto-promueve** otro producto para llenar el hueco: deja el flag vacío y el dashboard le avisa al admin "elegí un destacado". Elegir el destacado sigue siendo una decisión deliberada del admin, no algo que adivine el sistema.
- Por eso la landing **nunca** debe verse vacía ante un `404`: el frontend está obligado a tener un **fallback** (el producto activo más reciente, o un hero estático). La garantía de "landing no vacía" vive en el front, porque hay un caso —catálogo sin productos activos— que el backend no puede tapar.

### `GET /products/:slug` · Público

Ficha de producto. Se busca por **slug** (el identificador público legible; ver modelo de datos), no por `id`. Solo productos activos.

**Response** `200` — objeto **Producto (detalle)**:
```json
{
  "id": "…",
  "nombre": "Gorra Trucker Negra",
  "slug": "gorra-trucker-negra",
  "descripcion": "Gorra trucker de malla, ajuste snapback.",
  "precio": "15999.00",
  "stock": 12,
  "destacado": false,
  "glb_url": "https://cdn…/gorra-trucker.glb",
  "activo": true,
  "creado_en": "…",
  "actualizado_en": "…",
  "imagenes": [
    { "id": "…", "url": "https://cdn…/1.webp", "alt": "…", "orden": 0, "es_principal": true },
    { "id": "…", "url": "https://cdn…/2.webp", "alt": "…", "orden": 1, "es_principal": false }
  ]
}
```

**Notas**
- `imagenes` viene ordenada por `orden`. La `es_principal` es la portada que se ve en la card del catálogo.
- Devuelve el `id`: el frontend admin lo usa para las mutaciones (que van por `id`, no por slug).
- `404` si el slug no existe o el producto está inactivo.

---

## 5. Productos (administración)

Todas admin. Las mutaciones van por **`id`**. Editar el `nombre` **no** cambia el `slug` (la URL queda estable; ver modelo de datos).

Arranca con la **subida de archivos**, donde se generan las URLs (del `.glb` y de las imágenes) que consumen varios de los endpoints de producto de más abajo.

### Subida de archivos

Dos endpoints dedicados suben archivos a Cloudflare R2 y devuelven la URL. Se hace **por el backend** (*backend-proxy*): el navegador manda el archivo a la API, que —con sus credenciales de R2— lo guarda y responde la URL. Se eligió esta vía sobre la URL prefirmada por simplicidad (subidas solo del admin, bajo volumen) y porque deja al backend validar y comprimir en el mismo paso.

Son **dos endpoints separados** —y no uno con un parámetro de tipo— porque cada uno tiene reglas propias: distintos formatos aceptados y distinto tope de tamaño. El tope se aplica en el borde del request (antes de leer el cuerpo), así que conviene que cada uno corte en su propio límite en vez de forzar el tope grande del `.glb` a las imágenes.

#### `POST /uploads/model` · Admin

Sube un `.glb` y devuelve su URL, para usarla como `glb_url`.

**Request** — `multipart/form-data`: `file` (el `.glb`).
**Response** `201`
```json
{ "url": "https://cdn…/gorra-trucker.glb" }
```

**Notas**
- Acepta `.glb` (`model/gltf-binary`), comprimido con **Draco** (ya previsto en el plan) para no golpear los límites de tamaño de request de Railway/Render. La compresión ocurre *antes* de subir; es un buen criterio de "hecho" para la tarea.
- Escape para el caso raro de un modelo que aún así se pase de la raya: subirlo a mano al bucket de R2 y pegar la URL directo en `glb_url` al crear el producto (el campo es un string; al backend le da igual cómo llegó la URL). No es el flujo oficial, pero sirve como válvula sin tocar arquitectura.

#### `POST /uploads/image` · Admin

Sube una imagen y devuelve su URL, para usarla en `imagenes` (al crear el producto con `POST /products` o al sumar a la galería con `POST /products/:id/images`).

**Request** — `multipart/form-data`: `file` (la imagen).
**Response** `201`
```json
{ "url": "https://cdn…/1.webp" }
```

**Notas**
- Acepta `image/png`, `image/jpeg`, `image/webp`, con un tope de tamaño propio (mucho más chico que el del `.glb`).

### `GET /admin/products` · Admin

Listado para el dashboard: **incluye inactivos**, con todos los campos. Mismos `query params` que el catálogo público más `activo` (`true` / `false` / omitido = todos). Response paginado de objetos **Producto (detalle)**.

### `GET /admin/products/:id` · Admin

Un producto por `id` (incluye inactivos y su galería). Para precargar el formulario de edición. Response `200` — objeto **Producto (detalle)**.

### `POST /products` · Admin

Crea un producto **completo**: sus datos, el modelo 3D y sus imágenes, en una sola operación. El `slug` se genera solo a partir del `nombre` (y se garantiza único); se puede pasar uno para sobreescribir.

Los archivos (el `.glb` y las imágenes) se suben **antes** —cada uno a su endpoint de subida, que devuelve una URL— y acá viajan como URLs. Esto lo orquesta el frontend: el admin llena un solo formulario y da guardar; el front sube los archivos, junta las URLs y manda este único request.

**Request**
```json
{
  "nombre": "Gorra Trucker Negra",
  "descripcion": "Gorra trucker de malla, ajuste snapback.",
  "precio": "15999.00",
  "stock": 12,
  "glb_url": "https://cdn…/gorra-trucker.glb",
  "imagenes": [
    { "url": "https://cdn…/1.webp", "alt": "Gorra trucker negra de frente", "orden": 0, "es_principal": true },
    { "url": "https://cdn…/2.webp", "alt": "Gorra trucker negra de costado", "orden": 1, "es_principal": false }
  ]
}
```

**Response** `201` — objeto **Producto (detalle)** (con `activo: true`, `destacado: false`).

**Notas**
- `glb_url` es obligatorio (el visor es el rasgo distintivo). La URL sale de `POST /uploads/model`.
- `imagenes` requiere **al menos una** (relación 1..* del modelo de datos: un producto no existe sin imagen). Cada URL sale de `POST /uploads/image`. El `alt` es obligatorio por imagen; `orden` y `es_principal` son opcionales.
- Exactamente una imagen es la portada (`es_principal`). Si no se marca ninguna, el backend toma la primera; si se marca más de una, es `400`.
- El producto y sus imágenes se crean en una sola transacción, así que nace cumpliendo el 1..* y puede quedar activo de una (sin estado intermedio).
- Validaciones del backend: `precio > 0`, `stock ≥ 0`. `400` si no cumplen.
- `409` si el `slug` (autogenerado o pasado) colisiona y no se puede resolver.

### `PATCH /products/:id` · Admin

Edición parcial. Se mandan solo los campos a cambiar (mismos que en el POST, más `activo`). Response `200` — objeto **Producto (detalle)**.

### `DELETE /products/:id` · Admin

**Baja lógica:** setea `activo = false`, no borra la fila (así no se rompen las órdenes que ya compraron ese producto; ver modelo de datos). Para reactivarlo: `PATCH { "activo": true }`. Response `204`.

### `PUT /products/featured` · Admin

Elige el producto destacado de la landing. Se modela como un **recurso único** (el "espacio destacado"), que hace juego con el `GET /products/featured` que lo lee.

**Request**
```json
{ "product_id": "…" }
```

**Response** `200` — el producto que quedó destacado (con `destacado: true`).

**Notas**
- Reemplaza al destacado anterior en la misma operación (regla de "uno solo por alcance"; ver modelo de datos).
- Solo acepta un producto **activo**. `409` (o `404`) si el producto no existe o está inactivo.
- **No hay `DELETE`.** "Vaciar el destacado a propósito" no es una operación que tenga sentido en esta app: la landing es *sobre* mostrar un producto en 3D, así que dejarla sin destacado nunca es un objetivo. El estado vacío se alcanza solo como consecuencia (ver `GET /products/featured`), no con un botón.
- Al dar de baja un producto (`DELETE /products/:id`), si era el destacado, el backend le saca el flag automáticamente, para no dejar en la landing algo que ya no se vende.

### Imágenes de la galería

Las imágenes iniciales van en el `POST /products` (ver arriba). Estos endpoints gestionan la galería **después**: agregar más imágenes, editarlas o borrarlas. El archivo se sube aparte a `POST /uploads/image` (que devuelve una URL); acá se maneja el registro (la URL más su metadata), no el binario.

#### `POST /products/:id/images` · Admin

Agrega **una imagen más** a un producto ya existente.

**Request**
```json
{ "url": "https://cdn…/3.webp", "alt": "Gorra trucker negra por detrás", "orden": 2, "es_principal": false }
```

**Response** `201` — objeto **ImagenProducto** (`{ id, url, alt, orden, es_principal }`).

**Notas**
- La `url` sale de `POST /uploads/image`. `alt` es obligatorio; `orden` y `es_principal` son opcionales.
- Si `es_principal` es `true`, el backend desmarca la portada anterior (una sola principal por producto).

#### `PATCH /products/:id/images/:imageId` · Admin

Edita `alt`, `orden` o `es_principal` (marcar una como principal desmarca la anterior). Response `200`.

#### `DELETE /products/:id/images/:imageId` · Admin

Borra la imagen (registro + archivo en R2). Response `204`. **No** deja borrar la última imagen de un producto: el modelo exige al menos una (1..*). Para quitar la última, se da de baja el producto.

---

## 6. Direcciones

Libreta de direcciones del cliente (autenticado). Sirve para **precargar** el formulario de checkout: la dirección principal se propone y el usuario la confirma o edita. El pedido guarda una **copia** de los datos (ver sección 8), así que la libreta es una comodidad, no un requisito del flujo de compra.

Objeto **Direccion**:
```json
{
  "id": "…",
  "es_principal": true,
  "calle": "Av. Siempre Viva",
  "numero": "742",
  "piso_depto": "3B",
  "localidad": "La Plata",
  "provincia": "Buenos Aires",
  "codigo_postal": "1900",
  "creado_en": "…",
  "actualizado_en": "…"
}
```

- `GET /addresses` — mis direcciones. Response `200` — arreglo de **Direccion**.
- `POST /addresses` — crear. Request: la Direccion sin `id`/timestamps (`piso_depto` opcional). Si `es_principal: true`, el backend desmarca la anterior. Response `201`.
- `PATCH /addresses/:id` — editar (incluye marcar principal). Response `200`.
- `DELETE /addresses/:id` — borrar. No afecta a órdenes ya hechas (guardan copia). Response `204`.

---

## 7. Carrito

Un carrito por usuario (relación 1:1; ver modelo de datos). El backend lo crea solo la primera vez que se accede. Autenticado.

El **precio no se guarda** en el ítem: se lee del producto en tiempo real y el backend calcula los subtotales y el total en cada respuesta (se congela recién al pasar a orden).

Objeto **Carrito**:
```json
{
  "id": "…",
  "items": [
    {
      "id": "…",
      "producto": {
        "id": "…",
        "nombre": "Gorra Trucker Negra",
        "slug": "gorra-trucker-negra",
        "precio": "15999.00",
        "imagen_principal": { "url": "…", "alt": "…" },
        "stock": 12
      },
      "cantidad": 2,
      "subtotal": "31998.00"
    }
  ],
  "total": "31998.00",
  "actualizado_en": "…"
}
```

### `GET /cart` · Autenticado
Devuelve mi carrito (lo crea vacío si no existe). Response `200` — objeto **Carrito**.

### `POST /cart/items` · Autenticado
Agrega un producto. Si ya está en el carrito, **suma** a la cantidad existente (el par `carrito_id + producto_id` es único; ver modelo de datos).

**Request**
```json
{ "producto_id": "…", "cantidad": 1 }
```
**Response** `200` — el **Carrito** actualizado.
**Notas:** `cantidad ≥ 1`. Valida contra `stock` disponible → `409` si se pasa.

### `PATCH /cart/items/:id` · Autenticado
Setea la cantidad de un ítem (no suma, reemplaza).

**Request**
```json
{ "cantidad": 3 }
```
**Response** `200` — el **Carrito** actualizado. `409` si supera el stock.

### `DELETE /cart/items/:id` · Autenticado
Quita el ítem. Response `200` — el **Carrito** actualizado.

---

## 8. Órdenes y checkout

### Flujo de pago (para alinear front y back)

Mercado Pago **Checkout Pro por redirección**. La secuencia:

1. El frontend llama a `POST /orders` con los datos de envío.
2. El backend valida el carrito y el stock, crea la **Orden** en estado `PENDIENTE`, congela los ítems (snapshot de precio y nombre), crea la **preferencia** en Mercado Pago y devuelve el `init_point` (URL de pago). **El stock todavía no se descuenta.**
3. El frontend **redirige** al usuario al `init_point`. El usuario paga en el sitio de Mercado Pago.
4. Al terminar, Mercado Pago **redirige de vuelta** a una página del frontend (las `back_urls`: éxito / error / pendiente). **Esas páginas son rutas del frontend, no endpoints de esta API.**
5. En paralelo, Mercado Pago llama al **webhook** (`POST /webhooks/mercadopago`, server-to-server). Ahí el backend confirma el pago, pasa la orden a `PAGADA`, **descuenta el stock** y setea `pagada_en`.
6. La página de retorno del frontend consulta `GET /orders/:id` para mostrar el estado actualizado (puede necesitar reintentar unos segundos hasta que llegue el webhook).

> **Clave:** la confirmación viene por el webhook, no por el retorno del usuario. El estado real de la orden se lee siempre de `GET /orders/:id`.

Objeto **Orden (detalle)**:
```json
{
  "id": "…",
  "estado": "PENDIENTE",
  "total": "31998.00",
  "items": [
    {
      "id": "…",
      "producto_id": "…",
      "nombre_producto": "Gorra Trucker Negra",
      "precio_unitario": "15999.00",
      "cantidad": 2,
      "subtotal": "31998.00"
    }
  ],
  "envio": {
    "calle": "Av. Siempre Viva",
    "numero": "742",
    "piso_depto": "3B",
    "localidad": "La Plata",
    "provincia": "Buenos Aires",
    "codigo_postal": "1900",
    "telefono": "2211234567"
  },
  "mp_preference_id": "…",
  "mp_payment_id": null,
  "creado_en": "…",
  "actualizado_en": "…",
  "pagada_en": null
}
```

`estado` ∈ `PENDIENTE` · `PAGADA` · `RECHAZADA` · `CANCELADA` (ver modelo de datos). `nombre_producto` y `precio_unitario` son *snapshots* congelados; los datos de `envio` también son una copia, no una referencia a la libreta.

### `POST /orders` · Autenticado

Checkout: arma la orden desde el carrito y crea la preferencia de pago.

**Request**
```json
{
  "envio": {
    "calle": "Av. Siempre Viva",
    "numero": "742",
    "piso_depto": "3B",
    "localidad": "La Plata",
    "provincia": "Buenos Aires",
    "codigo_postal": "1900",
    "telefono": "2211234567"
  }
}
```

**Response** `201`
```json
{
  "order": { /* Orden (detalle) en estado PENDIENTE */ },
  "preference_id": "…",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=…"
}
```

**Notas**
- `telefono` es obligatorio (`envio_telefono` en el modelo). `piso_depto` opcional.
- El front puede precargar `envio` desde la dirección principal (`GET /addresses`), pero lo que se manda acá es lo que queda en la orden.
- `400` si el carrito está vacío. `409` si algún ítem ya no tiene stock suficiente (con el detalle de cuál).
- El carrito se vacía recién cuando la orden pasa a `PAGADA` (así, si el pago falla, el usuario reintenta sin recargar el carrito).

### `GET /orders` · Autenticado

Mis órdenes, paginadas, en formato *card*.

**Response** `200`
```json
{
  "data": [
    { "id": "…", "estado": "PAGADA", "total": "31998.00", "cantidad_items": 2, "creado_en": "…" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "total_pages": 1 }
}
```

### `GET /orders/:id` · Autenticado / Admin

Detalle de una orden. Accesible por su **dueño** o por un **admin**. La usa la página de retorno del checkout para mostrar el estado. Response `200` — objeto **Orden (detalle)**. `404` si no existe o no es del usuario (y no es admin).

---

## 9. Webhook de Mercado Pago

### `POST /webhooks/mercadopago` · Mercado Pago (server-to-server)

Lo llama Mercado Pago cuando cambia el estado de un pago, **no el frontend**. El backend consulta el pago en la API de Mercado Pago, traduce su estado al `EstadoOrden` interno (no es un espejo uno a uno; ver modelo de datos) y actualiza la orden:

- pago aprobado → `PAGADA`, guarda `mp_payment_id`, setea `pagada_en`, **descuenta el stock**, vacía el carrito.
- pago rechazado → `RECHAZADA`.
- abandono / preferencia vencida → `CANCELADA`.

**Notas**
- Debe ser **idempotente**: Mercado Pago puede reenviar la misma notificación. Reprocesar no debe descontar stock dos veces.
- Se valida la **firma** de Mercado Pago para asegurar que la llamada es legítima.
- El endpoint es público (lo llama un servidor externo), pero protegido por esa validación. Responde rápido (`200`/`204`).

---

## 10. Administración: órdenes y métricas

### `GET /admin/orders` · Admin

Todas las órdenes, paginadas. Acepta `?estado=PAGADA` para filtrar.

**Response** `200`
```json
{
  "data": [
    {
      "id": "…",
      "usuario": { "id": "…", "nombre": "Juan", "apellido": "Pérez", "email": "juan@mail.com" },
      "estado": "PAGADA",
      "total": "31998.00",
      "creado_en": "…",
      "pagada_en": "…"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15, "total_pages": 1 }
}
```

El detalle de una orden se lee con `GET /orders/:id` (el admin tiene acceso).

### `GET /admin/metrics` · Admin

Métricas mínimas del dashboard. Las ventas se calculan sobre `pagada_en` (para "ventas del mes" importa cuándo se pagó, no cuándo se creó; ver modelo de datos).

**Response** `200`
```json
{
  "ventas_del_mes": "154999.00",
  "ordenes_pagadas_mes": 12,
  "productos_sin_stock": 1
}
```

**Notas**
- Tres métricas, tres preguntas: cuánto factura la tienda este mes, cuántas ventas, y si hay algo para atender. `ventas_del_mes` suma el `total` de las órdenes `PAGADA` con `pagada_en` en el mes actual (única plata que de verdad entró); `ordenes_pagadas_mes` las cuenta; `productos_sin_stock` cuenta los productos activos con `stock = 0` (lo único accionable: reponer o dar de baja).
- No hay métricas de logística porque `EstadoOrden` no las modela (no existe "enviada"/"entregada"): la única palanca operativa del MVP es el stock.
- Lo demás —producto más vendido, series de tiempo, comparativas contra el mes anterior, ticket promedio, stock bajo con umbral— queda para las **métricas avanzadas de la segunda etapa**.

---

## 11. Qué NO es un endpoint de esta API

Para evitar confusiones al implementar:

- **Las `back_urls` de Mercado Pago** (éxito / error / pendiente) son **páginas del frontend**, no rutas del backend. Ahí se aterriza tras pagar; desde ahí se consulta `GET /orders/:id`.
- **El deploy en Vercel** es automático al hacer push (función nativa de Vercel), no una llamada a la API.
- **El logout** es del lado del cliente (descartar el token).
- **Servir imágenes y `.glb`** lo hace el CDN (Cloudflare R2) por URL directa; la API solo devuelve esas URLs.

---

*El contrato es el acuerdo entre front y back: cualquier cambio de forma se refleja acá antes de tocar código, y se propaga al plan y al modelo de datos si corresponde.*
