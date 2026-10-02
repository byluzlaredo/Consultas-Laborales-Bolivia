# Guia completa de pruebas

Esta carpeta contiene la matriz de pruebas del backend y de los contratos principales del frontend.

## Como leer cada prueba

Cada archivo `.test.ts` contiene exactamente un caso `test(...)`. La estructura interna usa AAA:

- **Arrange:** prepara datos, rutas, archivos o configuracion.
- **Act:** ejecuta la funcion o realiza la peticion HTTP.
- **Assert:** comprueba el resultado esperado.

Actualmente hay 51 archivos de prueba y 51 casos:

| Categoria | Archivos/casos | Dependencias principales |
|---|---:|---|
| Unitarias | 17 | Funciones y servicios aislados |
| Integracion | 6 | API real en `http://localhost:3001` |
| Transicion de estado | 8 | PostgreSQL y estado de documentos |
| Compatibilidad | 5 | Configuracion, archivos y estructura |
| Usabilidad | 5 | Codigo de componentes React |
| Caja Blanca | 7 | Ramas internas, validacion regex y seguridad JWT |
| Seguridad | 3 | API, datos y cliente |

Ejecutar toda la suite:

```powershell
npm test
```

Para Integracion la API debe estar levantada:

```powershell
npm run dev:server
```

Tambien se puede usar otra direccion:

```powershell
$env:API_URL = 'http://localhost:3013'
npm run test:integracion
```

---

# 1. Pruebas unitarias

Las unitarias prueban funciones individuales. No recorren toda la aplicacion y sirven para encontrar errores en reglas pequenas antes de probar los flujos completos.

## Configuracion de IA

### `ai-config-valid-prompt.test.ts`

Prueba que `validateSystemPrompt` acepte una instruccion no vacia. Prepara el texto, ejecuta la funcion y espera `true`. Existe porque el prompt controla el comportamiento legal del asistente; si se rechazaran textos validos, el administrador no podria actualizar las instrucciones. No prueba longitud maxima ni tipos distintos de texto.

### `ai-config-empty-prompt.test.ts`

Prueba que se rechacen un texto vacio y uno formado solo por espacios. Ejecuta la validacion con `''` y `'   '` y espera `false` en ambos. Existe para evitar guardar una configuracion sin instrucciones utiles. No prueba prompts demasiado largos.

### `ai-config-valid-parameters.test.ts`

Prueba temperatura y `max_tokens` dentro del rango permitido. Usa `(0.2, 500)`, `(0, 256)` y `(1, 2048)`, ejecuta `validateModelParameters` y espera tres resultados verdaderos. Existe para cubrir valores normales y los dos limites aceptados. No prueba `NaN`, infinito ni objetos.

### `ai-config-invalid-parameters.test.ts`

Prueba temperatura mayor que 1, tokens menores que 256 y tokens mayores que 2048. Ejecuta la validacion con `(1.1, 500)`, `(0.5, 255)` y `(0.5, 2049)` y espera `false`. Existe para impedir configuraciones que la aplicacion no admite. No prueba todos los tipos incorrectos.

## Calculo de beneficios
### `benefits-valid-input.test.ts`

Prepara fechas, salarios y vacaciones validas, ejecuta `validateBenefitsInput` y espera `{ valid: true }`. Existe para proteger el camino feliz basico antes del calculo del finiquito.

### `benefits-invalid-dates.test.ts`

Prueba una fecha imposible, `31/02/2021`, y un retiro anterior al ingreso. Ejecuta la validacion y espera el mensaje de entrada invalida. Existe porque fechas incorrectas producen antiguedad e importes incorrectos. No cubre todos los casos de anos bisiestos.

Prueba salario cero, salario negativo y vacaciones negativas. Crea tres copias de una entrada valida, cambia un dato en cada copia y espera `valid: false`. Existe para impedir calculos con importes imposibles. No prueba `NaN`, infinito ni montos enormes.

### `benefits-edge.test.ts`

Calcula una renuncia voluntaria y espera desahucio `0` y SPI `3000`. Existe porque la causal de salida modifica las formulas legales. No comprueba todos los rubros del finiquito.

### `benefits-causales.test.ts`

Calcula renuncia voluntaria y despido justificado, y comprueba que ambos tengan desahucio `0` mientras la indemnizacion mantenga su formula. Existe para comparar dos ramas legales. Se solapa parcialmente con `benefits-edge.test.ts`, pero agrega la causal de despido justificado.

### `benefits-documentado.test.ts`

Reproduce el caso documentado de despido injustificado: ingreso `15/01/2021`, retiro `15/01/2024`, salarios de `3500` y 15 dias de vacaciones. Compara SPI, dias comerciales, indemnizacion, desahucio, aguinaldo, vacaciones y total. Existe porque es la regresion mas importante del motor de beneficios.

## Validacion normativa

### `normativa-valid-file.test.ts`

Prueba un PDF valido frente a un JPG. Ejecuta `NormativaService.validateFile`, comprueba que el PDF sea aceptado y que el JPG sea rechazado con el mensaje correcto. Existe porque los documentos normativos deben entrar en un formato permitido.

### `normativa-invalid-file-metadata.test.ts`

Prueba un PDF mayor a 20 MB y metadata obligatoria vacia. Comprueba limite de archivo y mensaje de campos faltantes. Existe para evitar archivos demasiado grandes y registros imposibles de identificar. No cubre todos los tipos normativos invalidos.

### `normativa-statuses.test.ts`

Normaliza `Activo`, `Inactivo` y `Pendiente de Procesamiento`, y comprueba mensajes de actualizacion. Existe porque distintos nombres de estado deben convertirse a una representacion consistente. No cubre estados `ERROR`, `DEROGADA` o `MODIFICADA`.

## Analisis RAG

### `rag-calculation-query.test.ts`

Analiza una pregunta de despido despues de cinco anos. Comprueba intencion `calculo`, deteccion de despido, antiguedad, datos faltantes y terminos de recuperacion. Existe para asegurar que el RAG sepa que debe buscar normativa y calcular beneficios.

### `rag-complaint-query.test.ts`

Analiza una amenaza laboral. Comprueba intencion `denuncia`, conflicto detectado, datos faltantes y terminos de recuperacion. Existe para que una denuncia no se trate como un calculo automatico.

### `rag-follow-up-context.test.ts`

Envía una consulta de seguimiento con salarios, vacaciones y un historial anterior. Comprueba que los datos nuevos y el contexto aparezcan en el analisis. Existe porque los usuarios pueden repartir su informacion en varios mensajes.

### `rag-response-budget.test.ts`

Prueba la adaptacion de respuesta a `maxTokens`: con 256 calcula un presupuesto de 204 y genera instruccion breve; con 2048 calcula 1638 y genera instruccion detallada. Existe para que el chat priorice la conclusion cuando hay pocos tokens y no intente escribir una respuesta demasiado larga.

---

# 2. Pruebas de integracion

Estas pruebas usan `fetch` contra la API real. Comprueban rutas, middleware y respuestas HTTP juntos.

### `api-health.integration.test.ts`

Llama `GET /api/health`, convierte la respuesta a JSON y espera HTTP 200 y `ok: true`. Existe para confirmar que el servidor y sus dependencias basicas esten disponibles.

### `chat-history-auth.integration.test.ts`

Llama `GET /api/chat` sin JWT y espera HTTP 401, `success: false` y un mensaje. Existe para impedir acceso anonimo a conversaciones privadas.

### `chat-history.integration.test.ts`

Llama `GET /api/laboral/history` sin autenticacion y espera HTTP 401. Existe para proteger calculos, documentos e historial laboral. Es parecida a la prueba anterior, pero protege otra ruta.

### `ai-config.integration.test.ts`

Llama `GET /api/ai-config` sin token y espera HTTP 401. Existe porque temperatura, tokens, prompt, modelo y clave de IA son configuracion sensible.

### `not-found.integration.test.ts`

Llama una ruta inexistente y espera HTTP 404, `success: false` y el mensaje `Endpoint no encontrado`. Existe para comprobar el middleware global de rutas no encontradas.

### `register-validation.integration.test.ts`

Envía `POST /api/auth/register` con `{}` y espera HTTP 400, `success: false` y un mensaje. Existe para asegurar que la validacion detenga datos incompletos antes de insertar usuarios.

## Evaluacion de integracion

Los seis casos funcionan, pero la categoria necesita mas cobertura si se quiere validar toda la aplicacion. Faltan login valido e invalido, registro exitoso y duplicado, calculo laboral HTTP, chat autenticado, CRUD de normativa, procesamiento de documentos y aislamiento entre usuarios. Estos son huecos de cobertura, no errores de las pruebas existentes.

---

# 3. Pruebas de transicion de estado

Estas pruebas consultan PostgreSQL o procesan documentos pendientes. Son sensibles al estado real de la base de datos.

### `auth.ensureDemoAdmin.test.ts`

Conecta a PostgreSQL, busca el hash del administrador demo y usa `bcrypt.compare` con la contrasena configurada. Existe para asegurar que el usuario administrativo inicial sea utilizable. Depende de `db_sistema` y de la configuracion local.

### `pending-detection.test.ts`

Ejecuta `detectPendingLegalDocuments` y comprueba que devuelva un array. Existe para validar el contrato de entrada del procesador. Limitacion: un array vacio tambien pasa, por lo que no demuestra que haya detectado un documento real.

### `pending-documents.test.ts`

Ejecuta la misma deteccion y comprueba longitud y tipo array. Existe como evidencia separada del contrato de coleccion, pero se solapa bastante con `pending-detection.test.ts`.

### `process-pending.test.ts`

Ejecuta `processPendingLegalDocuments` y comprueba que `processed` y `errors` sean arrays. Existe para separar resultados correctos de errores de procesamiento.

### `processing-result.test.ts`

Ejecuta el procesamiento, exige exactamente las claves `processed` y `errors` y comprueba que sus elementos sean objetos. Es mas estricta sobre la forma del resultado, pero ejecuta la misma transaccion que `process-pending.test.ts`.

### `processing-error-message.test.ts`

Pasa un error de PDF a `formatProcessingError` y compara el mensaje normalizado. Existe para que los fallos de extraccion sean consistentes y comprensibles.

### `embedding-error-message.test.ts`

Pasa un error de red a `formatEmbeddingError` y compara el mensaje de embeddings. Existe para distinguir fallos de IA de fallos de lectura del PDF.

### `processing-errors.test.ts`

Ejecuta ambas funciones de formato de error en un solo caso y compara los dos mensajes. Existe como comprobacion conjunta, aunque repite parte de los dos archivos anteriores.

## Evaluacion de transacciones

Hay ocho casos, pero varios comprueban solamente la forma del resultado. Para una cobertura mas fuerte faltan cambios persistidos de estado, rollback ante error de PDF o embeddings, reintentos, insercion real de fragmentos y embeddings, y comprobacion del estado final de una normativa.

---

# 4. Pruebas de compatibilidad

Estas cinco pruebas son suficientes para la cantidad solicitada. Son comprobaciones estructurales y no necesitan API ni PostgreSQL.

### `api-routes.test.ts`

Lee `server/index.ts` y comprueba que existan las rutas principales de health, login, chat y calculos. Existe para detectar eliminacion accidental de contratos HTTP. No comprueba respuestas reales ni middleware.

### `frontend-entry.test.ts`

Lee `src/main.tsx` e `index.html`, y busca `createRoot` e `id="root"`. Existe porque React necesita ese punto de montaje. No abre el navegador.

### `package-scripts.test.ts`

Importa `package.json` y comprueba que existan los scripts de las categorias. Existe para evitar perder los comandos de ejecucion. No verifica por si sola que cada script termine correctamente.

### `public-assets.test.ts`

Comprueba que exista `public/Imagenes`. Existe para detectar eliminacion de la carpeta de recursos. No comprueba que cada imagen cargue.

### `typescript-config.test.ts`

Comprueba `strict`, `module: ESNext` y `moduleResolution: Bundler` en `tsconfig.json`. Existe para proteger la configuracion que sostiene la compilacion actual. El build real se valida aparte con `npx tsc --noEmit`.

## Evaluacion de compatibilidad

No hace falta agregar mas archivos para cumplir la matriz. Como mejora futura se podria probar el build, el arranque real, imports ESM y carga de assets, pero los cinco casos actuales cubren los contratos estructurales minimos.

---

# 5. Pruebas de usabilidad

Estas cinco pruebas revisan componentes React de forma estatica. No sustituyen una prueba real con navegador.

### `navigation.test.ts`

Lee `Navbar.tsx` y exige que exista `<Link>` o `<NavLink>`. Existe para detectar la desaparicion total de la navegacion de React Router. No verifica destinos, foco ni navegacion real.

### `input-limits.test.ts`

Lee `ChatPage.tsx` y busca `maxLength={500}` y el contador `500`. Existe para proteger el limite de entrada del chat. No escribe realmente 501 caracteres.

### `forms-labels.test.ts`

Cuenta etiquetas `<label>` en la calculadora y exige al menos cinco. Existe para preservar identificacion visible de campos. No comprueba que cada etiqueta este asociada a su input.

### `feedback.test.ts`

Busca `setError`, `loading` y `role="alert"` en calculadora e historial. Existe para comprobar que haya codigo de feedback. No simula una accion ni garantiza que el mensaje aparezca visualmente.

### `responsive-layout.test.ts`

Busca `max-w-6xl`, `lg:grid-cols-3` y `flex-wrap` en historial. Existe para preservar intencion responsive. No mide `scrollWidth`, viewport u overflow.

## Evaluacion de usabilidad

Los cinco casos son smoke tests estaticos. El informe manual registra problemas que estos tests no detectan: overflow horizontal, falta de feedback en calculadora, vista previa de documentos, navegacion por teclado y caracteres corruptos. Para validar eso de verdad se necesita Playwright o una prueba manual en navegador.

---

# 6. Pruebas de caja blanca

Estas siete pruebas revisan ramas y condiciones internas.

### `ai-branches.test.ts`

Ejecuta ramas valida e invalida de parametros de IA y ramas de prompt valido y vacio. Existe para comprobar decisiones internas de validacion. Se solapa con las unitarias de IA, pero muestra el camino de ramas en una sola prueba.

### `benefits-validation-branches.test.ts`

Ejecuta una entrada valida y otra con salario cero en `validateBenefitsInput`. Existe para confirmar que la funcion tome caminos distintos ante entrada aceptada y rechazada. No cubre todas las causas de rechazo.

### `normativa-branches.test.ts`

Ejecuta PDF valido, formato no PDF y archivo mayor a 20 MB. Existe para cubrir las tres decisiones principales de `validateFile`. No cubre metadata ni estados.

### `rag-branches.test.ts`

Ejecuta una consulta de calculo y otra de denuncia en `analyzeQuery`. Existe para cubrir dos caminos de clasificacion. No cubre intencion general o consulta laboral.

### `route-guards.test.ts`

Lee `server/index.ts`, localiza rutas `/api/admin` y exige `authGuard` y `adminGuard`. Existe para detectar que una ruta administrativa pierda sus guardas. Limitacion importante: es una comprobacion textual; no ejecuta Express ni valida tokens reales.

### `register-regex-validation.test.ts`

Ejecuta `AuthService.validateRegisterInput` con correos y contrasenas validos e invalidos. Comprueba que las expresiones regulares rechacen correos mal formados y contrasenas sin mayuscula, numero o caracter especial.

### `jwt-security.test.ts`

Genera y verifica un JWT con `AuthService`, comprueba los claims de identidad/rol y que no incluya `password_hash`. Tambien comprueba el rechazo de una firma manipulada y de un token vencido.

## Evaluacion de caja blanca

Las pruebas cubren ramas representativas, no todas las rutas. `route-guards.test.ts` comprueba declaraciones estaticamente; la verificacion JWT ejecuta la firma y validacion reales sin acceder a PostgreSQL.

---

# 7. Pruebas de seguridad

Los casos del apartado 4.3 se encuentran separados por nivel en `Seguridad/Aplicacion`, `Seguridad/Datos` y `Seguridad/Cliente`.

### Seguridad a nivel de aplicacion

`Seguridad/Aplicacion/security-application.integration.test.ts` comprueba `X-Content-Type-Options: nosniff` y que `/api/ai-config` responda HTTP 401 sin token.

### Seguridad a nivel de datos

`Seguridad/Datos/security-data.test.ts` comprueba que `AuthService.toUserResponse` no incluya el hash de contrasena.

### Seguridad a nivel de cliente

`Seguridad/Cliente/security-client.test.ts` comprueba que `AuthContext` envie el token Bearer, limpie el almacenamiento al cerrar sesion y llame al endpoint de logout. Es una prueba estatica, no una simulacion de navegador.

Ejecutar los tres casos:

```powershell
npm run test:seguridad
```

---

# Conclusion de la auditoria

## Categorias que estan bien para la matriz solicitada

- **Compatibilidad:** cinco casos diferentes y suficientes como smoke checks estructurales.
- **Caja Blanca:** siete casos de ramas, regex y JWT.
- **Unitarias:** es la categoria mas completa, con 17 casos.

## Categorias con mas casos pero con huecos

- **Integracion:** predominan rechazos sin autenticacion; faltan flujos exitosos autenticados.
- **Transicion de estado:** hay duplicidad en deteccion, resultados y mensajes; faltan rollback y estados persistidos.
- **Usabilidad:** los cinco casos leen codigo, pero no reemplazan pruebas reales de navegador.

## Duplicidades principales

1. `pending-detection.test.ts` y `pending-documents.test.ts` verifican casi el mismo retorno.
2. `process-pending.test.ts` y `processing-result.test.ts` ejecutan el mismo procesamiento.
3. Los tres archivos de mensajes de procesamiento se solapan parcialmente.
4. `ai-branches.test.ts` se solapa con las unitarias de IA.
5. `rag-branches.test.ts` se solapa con las unitarias de calculo y denuncia.

Estas duplicidades no rompen la suite. Se mantienen porque cada caso esta separado en su propio archivo y sirve como evidencia individual. Si se quisiera una suite mas pequena, esos serian los primeros candidatos para fusionar.

## Informe solicitado

El informe con la estructura 4.2 Tipos de prueba, 4.3 Niveles de seguridad y 4.4 Conclusion esta en `Tarea.md`. Incluye tambien las limitaciones de las pruebas estaticas de usabilidad y seguridad.
