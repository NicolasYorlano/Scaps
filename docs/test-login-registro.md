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
3. Click en "Registrarme".
4. **Esperado**: redirige a la landing (`/`) con la sesión ya iniciada.

### 3.2 Cerrar sesión y volver a entrar
1. Con la sesión iniciada del paso 3.1, ir a `http://localhost:5173/login`.
2. **Esperado**: en vez del formulario, aparece "Ya iniciaste sesión" con tu email y un botón "Cerrar sesión" (el Navbar no tiene logout todavía, así que este botón vive en la propia pantalla de login).
3. Click en "Cerrar sesión".
4. **Esperado**: aparece el formulario de login normal.
5. Ingresar el mismo email y contraseña del paso 3.1 y enviar.
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
2. **Esperado**: el navegador bloquea el envío (campos obligatorios).
3. En `/registro`, poner una contraseña de menos de 8 caracteres.
4. **Esperado**: aparece un mensaje de error en el mismo estilo que los de arriba, sin llegar a golpear el backend.

### 3.6 Doble envío
1. En cualquiera de las dos pantallas, completar el formulario y hacer click en el botón de submit.
2. **Esperado**: el botón se deshabilita mientras el request está en curso (no se puede hacer doble click y mandar dos requests).