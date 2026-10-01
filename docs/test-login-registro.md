# Cómo probar Login y Registro

Guía para probar `/login` y `/registro` desde el navegador, contra tu propia base de Neon.

## 1. Preparar tu entorno

Necesitás **tu propio proyecto de Neon** (cada dev tiene el suyo, ver "Base de datos" en el README).

Crear los archivos `apps/api/.env` y `apps/web/.env`, no vienen en el repo (están en `.gitignore`, cada uno tiene el suyo) la primera vez que cloná la rama:

1. `apps/api/.env`: copiá `apps/api/.env.example` a `apps/api/.env` y completá al menos:
   - `DATABASE_URL`: la cadena de conexión de tu Neon (con "Connection pooling" **apagado** en el panel — las migraciones de Prisma no andan sobre la conexión pooled).
   - `JWT_SECRET`: cualquier string largo y aleatorio (no hace falta que sea memorable, solo que exista).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`: los que quieras para el usuario admin del seed.
2. `apps/web/.env`: copiá `apps/web/.env.example` a `apps/web/.env` — el valor por defecto (`http://localhost:3000/api`) ya sirve para local, no hace falta tocarlo.
3. Desde la raíz del repo: `npm install`.
4. Crear las tablas y los datos iniciales en tu Neon (desde `apps/api`):
   ```
   npx prisma migrate dev
   npm run seed
   ```

## 2. Levantar los dos servidores

Cada uno en su propia terminal, desde la raíz del repo:

```
npm run start:dev -w @scaps/api
npm run dev -w @scaps/web
```

Confirmá que arrancaron bien:
- Backend: entrar a `http://localhost:3000/api/health` — debería responder algo, no dar error de conexión.
- Frontend: entrar a `http://localhost:5173` — debería cargar la landing.

## 3. Casos a probar

### 3.1 Registro exitoso
1. Ir a `http://localhost:5173/registro`.
2. Completar Nombre, Apellido, Email (uno que no hayas usado antes) y Contraseña (8+ caracteres).
3. Click en "Crear cuenta".
4. **Esperado**: redirige a la landing (`/`) con la sesión ya iniciada: la barra muestra tu nombre (en el celular, al lado del botón del menú).

### 3.2 Cerrar sesión y volver a entrar
1. Con la sesión iniciada del paso 3.1, ir a `http://localhost:5173/login`.
2. **Esperado**: no aparece el formulario; redirige a la landing, porque ya hay sesión. Con `/registro` pasa lo mismo.
3. Click en "Cerrar sesión", en la barra (en el celular, dentro del menú).
4. **Esperado**: la barra vuelve a mostrar "Ingresar" y "Crear cuenta".
5. Ir a `/login`, ingresar el mismo email y contraseña del paso 3.1 y enviar.
6. **Esperado**: redirige a `/` con la sesión iniciada otra vez.

### 3.3 Contraseña incorrecta
1. Ir a `/login`.
2. Ingresar un email registrado con una contraseña equivocada.
3. **Esperado**: mensaje de error visible en el formulario ("Credenciales inválidas"), sin pantalla rota ni redirección.

### 3.4 Email ya registrado
1. Ir a `/registro`.
2. Completar el formulario con un email que ya se usó en 3.1.
3. **Esperado**: mensaje de error visible ("El email ya está registrado"), y el formulario sigue usable (podés corregir el email y reintentar).

### 3.5 Validación de cliente (sin llegar a pedir nada al backend)
1. En `/registro` o `/login`, intentar enviar el formulario con campos vacíos.
2. **Esperado**: cada campo vacío queda en rojo con su mensaje debajo ("Ingresá tu email") y el foco va al primero. No aparece el globo del navegador.
3. En `/registro`, poner una contraseña de menos de 8 caracteres y enviar.
4. **Esperado**: el mensaje aparece debajo del campo y se va solo al llegar a 8 caracteres, sin llegar a golpear el backend.

### 3.6 Doble envío
1. En cualquiera de las dos pantallas, completar el formulario y hacer click en el botón de submit.
2. **Esperado**: mientras el request está en curso, el botón muestra "Ingresando…" o "Creando cuenta…" con un indicador de carga, y un segundo click o un Enter no mandan otro request.

### 3.7 Volver a la pantalla pedida
1. Sin sesión, ir a `http://localhost:5173/carrito`.
2. **Esperado**: redirige a `/login`.
3. Ingresar con una cuenta válida (o crear una desde "Crear cuenta").
4. **Esperado**: vuelve a `/carrito`, no a la landing, y el botón Atrás no regresa al formulario.

### 3.8 Sin conexión con el backend
1. Cortar el backend (Ctrl+C en su terminal) y, en `/login` o `/registro`, enviar el formulario completo.
2. **Esperado**: arriba del botón aparece un aviso gris ("No pudimos conectar con el servidor. Revisá tu conexión y volvé a intentar.") y ningún campo queda en rojo.
3. Levantar el backend de nuevo y reenviar.
4. **Esperado**: el aviso desaparece y el envío sigue su curso normal.