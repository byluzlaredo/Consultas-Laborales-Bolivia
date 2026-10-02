# Informe de pruebas de usabilidad

**Aplicacion:** Consulta Laboral Bolivia  
**Fecha:** 23/09/2026  
**Entorno:** navegador integrado, API local en `localhost:3013`, frontend en `localhost:5173`  
**Viewport observado:** 708 x 362 px

## Alcance

Se probaron los flujos visibles de chat, calculadora, documentos e historial, incluyendo:

- navegacion y descubribilidad;
- formularios y validacion;
- responsive y overflow horizontal;
- accesibilidad basica del arbol de accesibilidad;
- navegacion por teclado;
- limites de entrada;
- estados vacios y feedback despues de acciones;
- errores de consola durante recarga.

## Resumen

| Area | Resultado | Estado |
|---|---|---|
| Navegacion principal | Chat, Documentos, Calculadora e Historial visibles | Aprobada |
| Chat: campo y limite | Campo etiquetado; 501 caracteres se limita a 500 | Aprobada |
| Chat: responsive | Sin overflow horizontal observado | Aprobada |
| Calculadora: labels | Todos los campos tienen nombre accesible | Aprobada |
| Documentos: labels | Todos los campos tienen nombre accesible | Aprobada |
| Historial: responsive | `scrollWidth` 767 px con viewport de 708 px | Falla |
| Calculadora: resultado | Envio de datos validos no muestra resultado ni error visible | Falla |
| Documentos: vista previa | Envio de datos validos no cambia la vista previa | Falla |
| Teclado | `Tab` mantiene el foco en el mismo enlace | Falla |
| Consola | Sin errores ni warnings al recargar historial | Aprobada |
| Legibilidad | Varias conversaciones muestran caracteres `�` | Falla |

## Hallazgos

### U-01: Overflow horizontal en historial

**Severidad:** Alta  
**Reproduccion:** abrir `/history` en el viewport observado y medir el documento.  
**Evidencia:** `document.scrollWidth = 767`, `window.innerWidth = 708`.  
**Impacto:** el usuario movil debe desplazarse horizontalmente y puede perder contenido.

### U-02: Calculadora sin feedback despues del envio

**Severidad:** Alta  
**Reproduccion:** completar fechas `2021-01-15` y `2024-01-15`, motivo `Despido Injustificado`, tres salarios `3500` y `15` dias; pulsar `Calcular Finiquito`.  
**Resultado observado:** permanecen el formulario y el boton; no aparece resultado, alerta ni mensaje de error.

### U-03: Generacion de documento sin cambio visible

**Severidad:** Alta  
**Reproduccion:** completar nombres, cedula, empresa, cargo y fecha; pulsar `Generar vista previa`.  
**Resultado observado:** la vista continua en `PENDIENTE` y no muestra vista previa ni error.

### U-04: Navegacion por teclado no avanza

**Severidad:** Alta  
**Reproduccion:** enfocar el enlace `Consulta Laboral` y pulsar `Tab` repetidamente.  
**Resultado observado:** el foco permanece en el mismo enlace.

### U-05: Texto corrupto en historial y conversaciones

**Severidad:** Media  
**Evidencia:** se muestran cadenas como `�Qu� es un contrato de trabajo?` y `trabaj� 5 a�os`.  
**Impacto:** reduce la confianza y dificulta leer o localizar conversaciones.

## Resultados positivos

- El chat, calculadora, documentos e historial exponen navegación principal clara.
- Los campos de calculadora y documentos aparecen con nombres accesibles.
- El chat limita la consulta a `500` caracteres y muestra `500/500`.
- El chat, calculadora y documentos no presentaron overflow horizontal en el viewport observado.
- La recarga de historial no produjo errores ni warnings de consola.

## Recomendaciones prioritarias

1. Corregir el ancho mínimo o las columnas del historial para que `scrollWidth <= innerWidth` en móvil.
2. Mostrar estado de carga, resultado o error en calculadora y documentos después de enviar.
3. Revisar el estilo global de foco y el orden de tabulación; cada control debe recibir foco una sola vez y avanzar al siguiente.
4. Normalizar la codificación UTF-8 en respuestas, base de datos y renderizado del historial.
5. Repetir la prueba en 375 px, 768 px y escritorio después de corregir los hallazgos.

## Conclusión

La navegación y la estructura de los formularios son comprensibles, pero la experiencia todavía no está lista para considerarse completamente usable: hay fallos de feedback en acciones principales, accesibilidad de teclado, responsive del historial y codificación de texto.
