# 4.2. TIPOS DE PRUEBA

Las pruebas se organizan en caja negra y caja blanca. El apartado 4.2 contiene 48 casos: 41 de caja negra y 7 de caja blanca. El apartado 4.3 añade 3 casos de seguridad, para un total de 51. Se ejecutan con Node.js Test Runner, `node:assert/strict` y `tsx`; las pruebas HTTP usan `fetch`.

## 4.2.1. PRUEBAS DE CAJA NEGRA

Se comprueba el comportamiento observable de funciones, API, procesos y componentes sin depender de la estructura interna, salvo donde se indica que la prueba es estática.

### 4.2.1.1. PRUEBAS UNITARIAS

**17 casos.** Validan reglas individuales de configuración de IA, cálculo de beneficios sociales, validación de archivos y metadatos normativos, normalización de estados y análisis de consultas RAG.

Ejemplos representativos:

- `benefits-valid-input.test.ts` acepta fechas, salarios y vacaciones válidos.
- `benefits-invalid-dates.test.ts` rechaza fechas imposibles y retiros anteriores al ingreso.
- `benefits-documentado.test.ts` verifica los rubros y el total de un caso de despido injustificado.
- `ai-config-invalid-parameters.test.ts` rechaza parámetros de IA fuera de rango.
- `rag-complaint-query.test.ts` diferencia una consulta de denuncia de una solicitud de cálculo.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `ai-config-empty-prompt.test.ts` | Prompt vacío o con espacios: validación rechazada. | Aprobado |
| `ai-config-invalid-parameters.test.ts` | Temperatura y tokens fuera de rango: rechazados. | Aprobado |
| `ai-config-valid-parameters.test.ts` | Temperatura y tokens en límites permitidos: aceptados. | Aprobado |
| `ai-config-valid-prompt.test.ts` | Prompt con instrucciones: aceptado. | Aprobado |
| `benefits-causales.test.ts` | Renuncia y despido justificado: no generan desahucio. | Aprobado |
| `benefits-documentado.test.ts` | Caso documentado de despido injustificado: rubros y total coinciden. | Aprobado |
| `benefits-invalid-dates.test.ts` | Fecha imposible o retiro previo al ingreso: entrada rechazada. | Aprobado |
| `benefits-invalid-salary.test.ts` | Salario no válido o vacaciones negativas: entrada rechazada. | Aprobado |
| `benefits-valid-input.test.ts` | Fechas, salarios y días de vacaciones válidos: entrada aceptada. | Aprobado |
| `benefits.edge.test.ts` | Renuncia voluntaria: desahucio igual a cero. | Aprobado |
| `normativa-invalid-file-metadata.test.ts` | Archivo mayor al límite o metadata obligatoria vacía: rechazo. | Aprobado |
| `normativa-statuses.test.ts` | Estados admitidos: normalización y mensaje coherentes. | Aprobado |
| `normativa-valid-file.test.ts` | PDF permitido y formato no permitido: aceptación/rechazo correctos. | Aprobado |
| `rag-calculation-query.test.ts` | Consulta sobre despido: intención de cálculo y datos laborales detectados. | Aprobado |
| `rag-complaint-query.test.ts` | Consulta sobre amenaza laboral: intención de denuncia detectada. | Aprobado |
| `rag-follow-up-context.test.ts` | Seguimiento con historial: se conserva el contexto y los datos aportados. | Aprobado |
| `rag-response-budget.test.ts` | Presupuesto corto/largo: instrucción ajustada a los tokens disponibles. | Aprobado |
### 4.2.1.2. PRUEBAS DE INTEGRACIÓN

**6 casos.** Envían solicitudes HTTP a la API local, verificando conjuntamente rutas, middleware y respuestas. Requieren que la API esté en ejecución en `http://localhost:3001`, o que `API_URL` apunte a la dirección configurada.

Se verifica el estado de salud, el rechazo de accesos no autenticados a chat, historial y configuración de IA, el 404 de una ruta inexistente y la validación de un registro incompleto. Los casos de acceso sin autenticación esperan HTTP 401; el registro incompleto espera HTTP 400.

| Archivo/caso | Solicitud y resultado esperado | Resultado |
|---|---|---|
| `api-health.integration.test.ts` | `GET /api/health`: HTTP 200 y `ok: true`. | Aprobado |
| `ai-config.integration.test.ts` | `GET /api/ai-config` sin token: HTTP 401. | Aprobado |
| `chat-history-auth.integration.test.ts` | `GET /api/chat` sin token: HTTP 401. | Aprobado |
| `chat-history.integration.test.ts` | `GET /api/laboral/history` sin token: HTTP 401. | Aprobado |
| `not-found.integration.test.ts` | Ruta inexistente: HTTP 404 y respuesta controlada. | Aprobado |
| `register-validation.integration.test.ts` | Registro con cuerpo vacío: HTTP 400. | Aprobado |
**Límite:** estos casos no cubren todavía los flujos exitosos de registro/login con una cuenta de prueba ni todo el CRUD administrativo.

### 4.2.1.3. PRUEBAS DE TRANSICIÓN DE ESTADO

**8 casos.** Comprueban la preparación del administrador demo, la detección y el procesamiento de documentos pendientes, la estructura de los resultados y el formato de errores de PDF y embeddings.

Esta categoría depende de PostgreSQL y de los servicios configurados para procesar documentos. Algunas pruebas validan la forma de los resultados, no que una transición de estado haya quedado persistida; por tanto, no se consideran evidencia completa de rollback, reintento o atomicidad.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `auth.ensureDemoAdmin.test.ts` | Cuenta administrativa demo: hash compatible con la contraseña configurada. | Aprobado |
| `pending-detection.test.ts` | Detección de documentos pendientes: devuelve una colección. | Aprobado |
| `pending-documents.test.ts` | Resultado de detección: tipo de colección y longitud disponibles. | Aprobado |
| `process-pending.test.ts` | Procesamiento: devuelve colecciones `processed` y `errors`. | Aprobado |
| `processing-result.test.ts` | Resultado: claves y elementos con la estructura esperada. | Aprobado |
| `processing-error-message.test.ts` | Error de extracción de PDF: mensaje normalizado. | Aprobado |
| `embedding-error-message.test.ts` | Error de embeddings: mensaje normalizado. | Aprobado |
| `processing-errors.test.ts` | Errores de ambas etapas: mensajes consistentes. | Aprobado |

### 4.2.1.4. PRUEBAS DE COMPATIBILIDAD

**5 casos.** Son verificaciones estructurales sin necesidad de API ni PostgreSQL. Comprueban rutas esenciales, punto de entrada React, scripts de prueba, presencia de recursos públicos y configuración estricta de TypeScript.

Estas pruebas detectan cambios incompatibles en los contratos y archivos principales, pero no sustituyen un build ni una ejecución en cada navegador.

| Archivo/caso | Contrato comprobado | Resultado |
|---|---|---|
| `api-routes.test.ts` | Rutas esenciales de API declaradas. | Aprobado |
| `frontend-entry.test.ts` | Entrada React y elemento `root` presentes. | Aprobado |
| `package-scripts.test.ts` | Scripts de prueba requeridos declarados. | Aprobado |
| `public-assets.test.ts` | Directorio de imágenes públicas presente. | Aprobado |
| `typescript-config.test.ts` | TypeScript estricto y configuración ESM esperada. | Aprobado |

### 4.2.1.5. PRUEBAS DE USABILIDAD

**5 casos.** Revisan navegación, límites de entrada del chat, etiquetas de formularios, señales de error/carga y clases asociadas al diseño adaptable.

Los casos actuales inspeccionan el código fuente de los componentes; no simulan interacción real, lectores de pantalla ni diferentes tamaños de viewport. `Usabilidad/INFORME_USABILIDAD.md` complementa esta evidencia con observaciones manuales. Para acreditar navegación por teclado, ausencia de overflow y presentación visual se necesita una prueba de navegador o una revisión manual documentada.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `feedback.test.ts` | Calculadora e historial: existen señales de error/carga. | Aprobado |
| `forms-labels.test.ts` | Calculadora: campos con etiquetas visibles. | Aprobado |
| `input-limits.test.ts` | Chat: límite de 500 caracteres y contador presentes. | Aprobado |
| `navigation.test.ts` | Navegación: enlaces de React Router presentes. | Aprobado |
| `responsive-layout.test.ts` | Historial: clases de diseño adaptable presentes. | Aprobado |
## 4.2.2. PRUEBAS DE CAJA BLANCA

**7 casos.** Ejercitan decisiones y ramas internas de validadores, análisis RAG, protecciones de rutas, expresiones regulares de registro y manejo de JWT. Cada tabla presenta el caso, objetivo, datos utilizados y resultado observado.

**Tabla 3.7 Caso de prueba: Ramas de validación de configuración de IA**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Validación de parámetros y prompt del modelo (`PC-IA-01`). Archivo: `CajaBlanca/ai-branches.test.ts`. |
| Objetivo | Comprobar que la configuración acepte entradas válidas y rechace parámetros fuera de rango o instrucciones vacías. |
| Datos de prueba | Temperatura y tokens dentro del rango permitido; temperatura `1.1`; tokens `255` y `2049`; prompt con texto y prompt vacío. |
| Resultados | Los parámetros válidos y el prompt no vacío se aceptan. Los valores fuera del rango y el prompt vacío se rechazan. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Tabla 3.8 Caso de prueba: Ramas de validación de beneficios sociales**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Entrada válida frente a entrada salarial inválida (`PC-CALC-01`). Archivo: `CajaBlanca/benefits-validation-branches.test.ts`. |
| Objetivo | Verificar que la función de validación tome el camino de aceptación con datos coherentes y el de rechazo ante un salario inválido. |
| Datos de prueba | Caso laboral válido y una copia del caso con salario igual a `0`. |
| Resultados | La entrada válida retorna `valid: true`; la entrada con salario cero retorna `valid: false`. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Tabla 3.9 Caso de prueba: Ramas de validación de normativa**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Aceptación por formato y rechazo por tipo o tamaño (`PC-NORM-01`). Archivo: `CajaBlanca/normativa-branches.test.ts`. |
| Objetivo | Comprobar las decisiones principales del validador de archivos normativos. |
| Datos de prueba | Archivo PDF válido, archivo de formato distinto de PDF y PDF de más de 20 MB. |
| Resultados | El PDF permitido se acepta; el formato no permitido y el archivo que supera el límite se rechazan. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Tabla 3.10 Caso de prueba: Ramas de clasificación del servicio RAG**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Clasificación de consulta laboral y denuncia (`PC-RAG-01`). Archivo: `CajaBlanca/rag-branches.test.ts`. |
| Objetivo | Comprobar que distintas consultas recorran ramas diferentes de clasificación. |
| Datos de prueba | Una consulta sobre cálculo de beneficios y otra sobre un conflicto o denuncia laboral. |
| Resultados | La primera se clasifica como cálculo y la segunda como denuncia. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Tabla 3.11 Caso de prueba: Guardas de rutas administrativas**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Comprobación de autenticación y rol en rutas administrativas (`PC-ACC-01`). Archivo: `CajaBlanca/route-guards.test.ts`. |
| Objetivo | Detectar rutas `/api/admin` que no declaren las protecciones requeridas. |
| Datos de prueba | Lectura de `server/index.ts` y búsqueda de rutas administrativas que incluyan `authGuard` y `adminGuard`. |
| Resultados | Se encuentran al menos cinco rutas administrativas y todas contienen ambas guardas. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

### 4.2.2.1. PRUEBAS DE VALIDACIÓN DE FORMULARIOS CON EXPRESIONES REGULARES (REGEX)

**Tabla 3.12 Caso de prueba: Validación de formularios mediante expresiones regulares**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Validación regex de correo y contraseña de registro (`PC-REGEX-01`). Archivo: `CajaBlanca/register-regex-validation.test.ts`. |
| Objetivo | Aceptar un formulario correcto y rechazar correos mal formados o contraseñas que no cumplan los requisitos. |
| Datos de prueba | Correo válido `ana@example.bo` y contraseña `Seguro123!`; correos con espacios, sin usuario, sin `@` o sin dominio completo; contraseñas sin mayúscula, sin número o sin carácter especial. |
| Resultados | El formulario válido se acepta. Los correos y contraseñas que incumplen las reglas se rechazan con el error de validación correspondiente. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

### 4.2.2.2. PRUEBAS DE SEGURIDAD MEDIANTE JSON WEB TOKEN (JWT)

**Tabla 3.13 Caso de prueba: Seguridad y validación de JSON Web Token**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Firma y verificación de token JWT (`PC-JWT-01`). Archivo: `CajaBlanca/jwt-security.test.ts`. |
| Objetivo | Confirmar los claims permitidos y que tokens alterados o vencidos no sean aceptados. |
| Datos de prueba | Usuario de prueba con `id: 42`, correo y rol `USUARIO`; token firmado válido; token con firma manipulada; token vencido. |
| Resultados | El token válido conserva `id`, `correo` y `rol`, sin exponer `password_hash`. La firma manipulada y el token vencido son rechazados. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

`CajaBlanca/route-guards.test.ts` verifica además que las rutas administrativas declaren autenticación y autorización de administrador. Las pruebas de integración de historial y configuración comprueban el rechazo HTTP de solicitudes sin token.

# 4.3. NIVELES DE SEGURIDAD DEL SISTEMA

La suite revisa mecanismos concretos de seguridad implementados. No equivale a una auditoría de penetración ni demuestra ausencia de vulnerabilidades.

## 4.3.1. SEGURIDAD A NIVEL DE APLICACIÓN

- `server/index.ts` habilita Helmet y configura CORS con el origen del frontend.
- Las rutas privadas aplican `authGuard`; las rutas de administración aplican además `adminGuard`.
- `authGuard` valida el JWT, consulta si fue revocado y comprueba que el usuario siga activo.
- `validateRuntimeConfig` exige en producción un `JWT_SECRET` de al menos 32 caracteres y una contraseña de administrador de al menos 8 caracteres.
- Evidencia automatizada: `CajaBlanca/jwt-security.test.ts`, `CajaBlanca/route-guards.test.ts` y las pruebas de integración de rutas protegidas.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `Seguridad/Aplicacion/security-application.integration.test.ts` | Helmet responde `nosniff` y `/api/ai-config` sin token devuelve HTTP 401. | Aprobado |

**Tabla 3.14 Caso de prueba: Seguridad a nivel de aplicación**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Cabeceras HTTP seguras y protección de configuración (`PS-APP-01`). |
| Objetivo | Verificar una cabecera de Helmet y el control de acceso a una ruta sensible de la API. |
| Datos de prueba | Solicitud a `/api/health` y solicitud sin JWT a `/api/ai-config`. |
| Resultados | La respuesta incluye `X-Content-Type-Options: nosniff`; la ruta protegida responde HTTP 401. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Límite:** `route-guards.test.ts` es una comprobación estática de las declaraciones de rutas; no sustituye pruebas HTTP con tokens válidos, roles distintos y sesiones revocadas.

## 4.3.2. SEGURIDAD A NIVEL DE DATOS

- El registro y cambio de contraseña almacenan hashes generados con bcrypt; las respuestas de usuario se construyen mediante `toUserResponse`, que excluye `password_hash`.
- Las consultas de autenticación utilizan parámetros SQL (`$1`, `$2`, etc.) en lugar de concatenar los valores recibidos.
- Los tokens de recuperación se almacenan como hash bcrypt y los tokens revocados se identifican mediante SHA-256.
- `schema_sistema.sql` declara correo único, campos obligatorios y claves foráneas con reglas de borrado.
- `Seguridad/Datos/security-data.test.ts` valida que `toUserResponse` no filtre el hash de contraseña.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `Seguridad/Datos/security-data.test.ts` | La respuesta conserva los datos públicos y excluye el hash privado. | Aprobado |

**Tabla 3.15 Caso de prueba: Seguridad a nivel de datos**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Protección del hash de contraseña en la respuesta de usuario (`PS-DAT-01`). |
| Objetivo | Evitar que el serializador de usuarios exponga información de autenticación. |
| Datos de prueba | Usuario de prueba con correo y `password_hash` privado; conversión con `AuthService.toUserResponse`. |
| Resultados | Se conservan los datos públicos, el campo `password_hash` no existe en la respuesta y su valor no aparece en el JSON. Caso aprobado. |

*Fuente: Elaboración propia, 2026.*

**Límite:** la suite actual no demuestra cifrado de datos en reposo, políticas de respaldo, control de acceso a la base de datos ni resistencia a inyección mediante pruebas dinámicas.

## 4.3.3. SEGURIDAD A NIVEL DE CLIENTE

- `src/context/AuthContext.tsx` envía el token mediante `Authorization: Bearer` y valida la sesión consultando `/api/users/profile`.
- Al cerrar sesión, solicita el cierre al servidor y elimina de `localStorage` los datos de sesión y el token.
- La prueba de caja blanca JWT comprueba que el hash de contraseña no forme parte de los claims emitidos.
- `Seguridad/Cliente/security-client.test.ts` comprueba el envío Bearer y la limpieza del token cuando se cierra la sesión.

| Archivo/caso | Escenario y resultado esperado | Resultado |
|---|---|---|
| `Seguridad/Cliente/security-client.test.ts` | `AuthContext` envía Bearer, elimina el token y llama logout. | Aprobado |

**Tabla 3.16 Caso de prueba: Seguridad a nivel de cliente**

| Parámetro | Detalle de la evaluación |
|---|---|
| Caso de prueba | Manejo del token de sesión en el cliente (`PS-CLI-01`). |
| Objetivo | Comprobar el envío de credenciales en el encabezado esperado y la limpieza de la sesión al cerrar. |
| Datos de prueba | Inspección de `src/context/AuthContext.tsx`: encabezado Bearer, eliminación del token de `localStorage` y solicitud al endpoint de logout. |
| Resultados | Se encuentran las tres operaciones en el contexto de autenticación. Caso aprobado. La comprobación es estática y no simula el navegador. |

*Fuente: Elaboración propia, 2026.*

**Límite:** guardar el JWT en `localStorage` permite que JavaScript del mismo origen lo lea; la suite no evalúa XSS, CSP, almacenamiento seguro en cookies ni accesibilidad real. Se recomienda cubrir estas superficies antes de considerar la revisión de seguridad completa.

# 4.4. CONCLUSIÓN DE PRUEBAS

La matriz automatizada reúne 51 casos: 17 unitarios, 6 de integración, 8 de transición de estado, 5 de compatibilidad, 5 de usabilidad, 7 de caja blanca y 3 de seguridad separados por nivel. Incluye reglas regex del formulario y generación/verificación JWT, incluyendo firmas manipuladas y tokens vencidos.

Los tres nuevos casos por nivel de seguridad pasaron de forma aislada. La ejecución completa de `npm test` terminó con **51 aprobados y 0 fallidos** el 30/09/2026, con API y PostgreSQL disponibles. La cobertura detecta regresiones funcionales y de configuración, pero quedan pendientes flujos autenticados de extremo a extremo, persistencia y rollback de estados, y pruebas reales de navegador y seguridad.

## Ejecución

```powershell
npm test
```

Para integración y seguridad de aplicación, iniciar primero la API con `npm run dev:server`. Las pruebas de transición requieren PostgreSQL y los servicios que utilice el procesamiento. Las pruebas de seguridad se ejecutan por separado con `npm run test:seguridad`. También se puede ejecutar caja blanca de forma aislada:

```powershell
npm run test:caja-blanca
```
