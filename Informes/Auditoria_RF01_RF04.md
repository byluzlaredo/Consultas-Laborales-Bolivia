# Auditoría funcional RF01-RF04

Fecha: 2026-09-10
Proyecto: Consulta Laboral Bolivia

## Alcance y arquitectura real

El flujo que realmente ejecuta el servidor es:

- Frontend: React + Vite en `src/`, con `BrowserRouter` y `AuthContext`.
- Backend: Express en `server/index.ts`, ejecutado con `npm run dev:server`.
- Base de datos del sistema: PostgreSQL `db_sistema` en `localhost:55432`.
- Base vectorial: PostgreSQL `db_vectorial` en `localhost:55433`.
- Autenticación: JWT firmado con `JWT_SECRET`, guardado en el navegador bajo `clb_token`.
- Usuario de sesión: JSON en `localStorage` bajo `clb_auth`.
- Contraseñas: bcrypt en `usuario.password_hash`.
- Recuperación: token aleatorio, guardado como bcrypt en `tokens_recuperacion.token_hash`, con expiración y uso único.
- Correo: Nodemailer mediante SMTP y enlace a `/reset-password?token=...`.

La implementación real usa `server/modules/auth`, `server/modules/users`, `server/common/guards.ts` y las rutas registradas en `server/index.ts`. El antiguo `src/controllers/authController.ts` no estaba conectado al router y se eliminó porque almacenaba contraseñas en texto plano y simulaba tokens.

## RF01 — Registro autónomo y asignación de roles

Estado: CORREGIDO E IMPLEMENTADO

### Qué se encontró

El registro real estaba conectado a `POST /api/auth/register`. Ya usaba bcrypt, correo único y rol `USUARIO`, pero se incorporó también el departamento obligatorio de Bolivia. El administrador no puede ser elegido desde el payload porque el servicio fija el rol en SQL.

### Qué se corrigió

- Selector obligatorio de los nueve departamentos bolivianos.
- Validación frontend y backend del departamento.
- Persistencia en `usuario.departamento`.
- Validación de correo y contraseña en frontend y backend.
- Hash bcrypt antes del INSERT.
- Rol fijado por backend como `USUARIO`.
- Estado inicial fijado como activo.
- Columna compatible para bases existentes mediante `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` al iniciar.
- Eliminación del controlador legado que guardaba contraseñas sin hash.

### Endpoints y tablas

- `POST /api/auth/register`
- `POST /api/auth/login`
- Tabla `usuario`: `nombre`, `apellido`, `correo`, `password_hash`, `departamento`, `rol`, `activo`.

### Comprobación real

Se registró un usuario temporal en la API y se verificó:

- HTTP 201.
- Usuario creado en PostgreSQL.
- Rol recibido: `USUARIO`.
- Departamento recibido: `La Paz`.
- Login posterior exitoso con HTTP 200.
- Correo duplicado rechazado con HTTP 409.
- Campos faltantes rechazados con HTTP 400.
- La respuesta no expone `password_hash`.

## RF02 — Autenticación y control de acceso

Estado: CORREGIDO E IMPLEMENTADO

### Qué se encontró

El backend real valida bcrypt y JWT. El frontend guardaba el token en `localStorage`, pero el logout solo lo eliminaba localmente; un JWT válido podía seguir funcionando hasta expirar. Además, la revocación no existía.

### Qué se corrigió

- Se agregó la tabla `tokens_revocados`.
- `POST /api/auth/logout` revoca el JWT actual mediante SHA-256.
- `authGuard` comprueba firma, expiración y revocación en cada petición.
- Se mantiene `adminGuard` en todos los endpoints administrativos.
- El frontend borra `clb_token` y `clb_auth` al cerrar sesión y solicita la revocación al backend.
- El rol administrativo se valida en backend, no solo en React.

### Endpoints y tablas

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/users/profile`
- `GET /api/admin/users`
- Tabla `usuario` y tabla `tokens_revocados`.

### Comprobación real

- Usuario válido: login HTTP 200 y perfil protegido HTTP 200.
- Usuario normal contra `/api/admin/users`: HTTP 403.
- Contraseña incorrecta: HTTP 401.
- Endpoint protegido sin token: HTTP 401.
- Logout: HTTP 200.
- Reutilización del mismo JWT después de logout: HTTP 401.

## RF03 — Perfil, cambio de contraseña y cierre de sesión

Estado: CORREGIDO E IMPLEMENTADO

### Qué se encontró

La pantalla de perfil ya tenía formularios y endpoints funcionales. Sin embargo, después de modificar el perfil el estado global no se actualizaba inmediatamente, y la pantalla dependía demasiado de los datos guardados localmente.

### Qué se corrigió

- El perfil consulta `GET /api/users/profile` al abrirse.
- Los cambios exitosos actualizan `AuthContext` y, por tanto, la navegación refleja el nombre nuevo.
- El cambio de contraseña valida contraseña actual, longitud, mayúscula, número, carácter especial y confirmación.
- La nueva contraseña se almacena con bcrypt.
- El cierre de sesión revoca el JWT y elimina el almacenamiento local.
- Ninguna respuesta de usuario incluye `password_hash`.

### Comprobación real

- Login con usuario temporal.
- `PATCH /api/users/profile` con nuevo nombre y apellido.
- Nueva consulta de perfil confirmó los datos persistidos.
- Cambio de contraseña HTTP 200.
- Login con contraseña antigua: HTTP 401.
- Login con contraseña nueva: HTTP 200.
- `password_hash` no apareció en la respuesta de login.

## RF04 — Recuperación de credenciales

Estado: CORREGIDO E IMPLEMENTADO

### Causa real del problema del token

El flujo guardaba correctamente un hash bcrypt del token, pero no tenía un endpoint para validar el token al abrir el enlace. El frontend solo comprobaba si existía el parámetro `token`; por eso el formulario podía mostrarse aunque el token fuera inválido. También faltaba revocación JWT al cerrar sesión y el envío de correo ocultaba los errores SMTP.

### Qué se corrigió

- Token generado con `randomBytes(32).toString('hex')`.
- Token enviado codificado con `encodeURIComponent`.
- Frontend lo recupera con `URLSearchParams` y lo vuelve a codificar solo al consultar validación.
- Nuevo endpoint `GET /api/auth/reset-password/validate?token=...`.
- El backend compara el token recibido contra bcrypt.
- Se verifica expiración y `used_at IS NULL`.
- `POST /api/auth/reset-password` vuelve a validar el token.
- Consumo del token y actualización de contraseña se realizan en una transacción.
- El token queda inutilizado después del primer uso.
- SMTP deja de ocultar el error: si no puede enviar, la solicitud falla en lugar de prometer un correo inexistente.
- `RESET_TOKEN_EXPIRY` ahora controla la expiración real.
- El enlace apunta a `FRONTEND_URL`.

### Endpoints y tablas

- `POST /api/auth/forgot-password`
- `GET /api/auth/reset-password/validate?token=...`
- `POST /api/auth/reset-password`
- Tabla `tokens_recuperacion`: `id_usuario`, `token_hash`, `expires_at`, `used_at`.
- Tabla `usuario`: `password_hash`.

### Comprobación real

Se insertó un token bcrypt controlado en PostgreSQL para probar el flujo sin depender de leer un correo:

- Token válido: validación HTTP 200.
- Reset válido: HTTP 200.
- Reutilización del mismo token: HTTP 400.
- Token modificado: HTTP 400.
- Token expirado: HTTP 400.
- Login con contraseña nueva: HTTP 200.
- Solicitud real de recuperación con SMTP configurado: HTTP 200 y registro de token en PostgreSQL.

## Tabla de pruebas realizadas

| Prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|
| Registro de usuario | Usuario creado | HTTP 201, rol USUARIO y departamento guardados | PASS |
| Registro con campos faltantes | Rechazo claro | HTTP 400 | PASS |
| Registro con correo duplicado | Rechazo | HTTP 409 | PASS |
| Login usuario válido | Acceso permitido | HTTP 200 | PASS |
| Login incorrecto | Rechazo | HTTP 401 | PASS |
| Endpoint sin token | Rechazo | HTTP 401 | PASS |
| Usuario normal a admin | Rechazo | HTTP 403 | PASS |
| Logout | Sesión inutilizada | HTTP 200 y JWT posterior HTTP 401 | PASS |
| Modificar perfil | Datos persistidos | PATCH exitoso y GET confirmó cambios | PASS |
| Cambiar contraseña | Nueva contraseña funcional | Antigua 401, nueva 200 | PASS |
| Respuesta sin secreto | No exponer hash | `password_hash` ausente | PASS |
| Solicitar recuperación | Token generado | HTTP 200 y fila en tokens_recuperacion | PASS |
| Token válido | Aceptado | HTTP 200 | PASS |
| Token modificado | Rechazado | HTTP 400 | PASS |
| Token expirado | Rechazado | HTTP 400 | PASS |
| Token reutilizado | Rechazado | HTTP 400 | PASS |
| Login tras recuperación | Nueva contraseña válida | HTTP 200 | PASS |
| Compilación TypeScript | Sin errores | `tsc --noEmit` correcto | PASS |
| Pruebas unitarias existentes | Sin regresión | 4/4 PASS | PASS |

## Archivos modificados

- `server/modules/auth/auth.dto.ts`: tipos de departamentos y validación de token.
- `server/modules/auth/auth.service.ts`: bcrypt, tokens seguros, expiración configurable, transacciones, revocación JWT y migraciones.
- `server/modules/auth/auth.controller.ts`: logout y validación de token.
- `server/common/guards.ts`: comprobación de tokens revocados.
- `server/index.ts`: nuevas rutas de logout y validación.
- `server/modules/email/email.service.ts`: enlace codificado y expiración configurable.
- `server/config/index.ts`: configuración de expiración de reset.
- `server/modules/users/users.service.ts`: departamento y respuesta de perfil.
- `src/context/AuthContext.tsx`: logout real y actualización de usuario.
- `src/pages/ProfilePage.tsx`: carga real y actualización de perfil.
- `src/pages/ResetPasswordPage.tsx`: validación del token al abrir el enlace.
- `src/pages/RegisterPage.tsx`: selector de departamento.
- `src/types/auth.ts`: tipos y catálogo de departamentos.
- `schema_sistema.sql` y `init.sql`: departamento y tokens revocados.
- `.env.example`: corrección del puerto de la base vectorial.
- `src/controllers/authController.ts`: eliminado por ser código legado inseguro y no conectado.

## Problemas pendientes y límites de la prueba

- La solicitud SMTP real respondió HTTP 200 con la configuración presente. La entrega final en la bandeja del destinatario depende del proveedor SMTP y no puede verificarse desde la API sin acceso al buzón.
- El informe usa un usuario temporal de auditoría creado en la base. Debe eliminarse manualmente si se desea una base limpia.
- En producción debe cambiarse `JWT_SECRET`, `ADMIN_PASSWORD` y las credenciales SMTP; no se deben usar valores de desarrollo.
- El botón Atrás puede mostrar una vista cacheada del navegador, pero las peticiones posteriores quedan bloqueadas por el backend después del logout.

## Conclusión

RF01, RF02, RF03 y RF04 quedaron implementados y probados con la API real, PostgreSQL y el frontend conectado. Los flujos críticos de contraseña, roles, JWT, logout, perfil y tokens de recuperación ya no dependen de simulaciones del frontend.
