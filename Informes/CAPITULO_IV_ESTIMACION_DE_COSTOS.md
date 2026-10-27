# CAPÍTULO IV. ESTIMACIÓN DE COSTOS

## 4.1. INTRODUCCIÓN

El objetivo del presente capítulo es identificar, estructurar, cuantificar y documentar de manera técnica y pragmática la estimación de los costos económicos requeridos para la investigación, diseño, desarrollo, pruebas, puesta en marcha y alojamiento del sistema web **"Consulta Laboral Bolivia"**.

Para garantizar un cálculo riguroso y científicamente respaldado en la disciplina de la ingeniería de software, se aplica el **Modelo Constructivo de Costos COCOMO I (Constructive Cost Model)** propuesto por Barry Boehm, complementado con un análisis empírico de mercado adaptado a los límites y tarifas vigentes en el contexto socioeconómico del Estado Plurinacional de Bolivia.

La estimación contempla cuatro ejes presupuestarios fundamentales:
1. **Costo de Personal:** Calculado a partir del conteo real de líneas de código fuente (SLOC / LOC) del proyecto mediante las fórmulas del modelo COCOMO Básico (modo orgánico), cruzado con las remuneraciones promedio del sector de desarrollo de software en Bolivia.
2. **Costo de Viaje y Viáticos:** Asociado a traslados para el levantamiento de requisitos, entrevistas con expertos en derecho laboral boliviano y revisiones académicas presenciales con tribunales y tutores de grado.
3. **Costo de Alojamiento del Proyecto e Infraestructura Tecnológica:** Servicios de computación en la nube para el despliegue del frontend, backend, base de datos relacional y vectorial con extensión `pgvector`, licenciamiento de dominio web y consumo de cuotas del API de Inteligencia Artificial (OpenAI API para embeddings y modelos generativos).
4. **Costo de Consumibles y Materiales de Escritorio:** Gastos operativos en impresiones, fotocopias, anillados y empastados de los informes técnicos y documentos de tesis.

Todos los valores económicos se expresan en **Bolivianos (BOB)** y su respectiva equivalencia en **Dólares Estadounidenses (USD)**, considerando el tipo de cambio oficial de **1 USD = 6.96 BOB**.

---

## 4.2. COSTO DEL PERSONAL

Para la determinación del costo de personal, se implementa una metodología formal de estimación fundamentada en la volumetría de código fuente del aplicativo y el modelo algorítmico COCOMO 81.

### 4.2.1. Conteo de Líneas de Código Fuente (SLOC / KLOC)

Se realizó un escaneo automatizado y exhaustivo de todos los archivos fuente que componen la arquitectura de la solución (excluyendo dependencias externas de `node_modules`, archivos compilados en `dist` y repositorios `.git`).

La arquitectura del sistema **Consulta Laboral Bolivia** comprende los siguientes módulos:
- **Frontend:** Aplicación web en React, TypeScript y Tailwind CSS (`src/`).
- **Backend:** Servidor API REST en Express y TypeScript (`server/`), con servicios de seguridad (JWT, bcrypt, helmet), cálculo de beneficios sociales conforme a la Ley General del Trabajo y motor RAG (Retrieval-Augmented Generation).
- **Base de Datos y Vectorización:** Scripts de inicialización y esquemas relacionales y vectoriales para PostgreSQL con `pgvector` (`.sql`).
- **Scripts de Automatización y Pruebas:** Módulos de ingesta y vectorización de normativa laboral en PDF y batería de pruebas automatizadas.

El resumen cuantitativo de líneas de código se detalla en la Tabla 4.1:

#### Tabla 4.1. Conteo de Líneas de Código Fuente del Proyecto (LOC)
| Componente / Directorio | Lenguaje / Extensión | Cantidad de Archivos | Líneas de Código (LOC) | Porcentaje (%) |
| :--- | :--- | :---: | :---: | :---: |
| Backend & Servicios (`server/`) | TypeScript (`.ts`) / JavaScript (`.js`) | 48 | 6,844 | 58.90 % |
| Frontend Web (`src/`) | React + TypeScript (`.tsx` / `.ts` / `.css`) | 39 | 4,286 | 36.88 % |
| Base de Datos Relacional y Vectorial | SQL (`.sql`) | 3 | 446 | 3.84 % |
| Estructura y Configuración | HTML (`.html`) y utilitarios | 3 | 44 | 0.38 % |
| **TOTAL GENERAL** | — | **93** | **11,620** | **100.00 %** |

> **Total de Líneas de Código (LOC):** $11,620$ líneas  
> **Miles de Líneas de Código (KLOC):** $11.62 \text{ KLOC}$ ($11,620 / 1,000$)

---

### 4.2.2. Aplicación del Modelo COCOMO Básico

El proyecto califica en la categoría de **Modo Orgánico**, debido a que:
- Se desarrolla en un entorno flexible y controlado.
- El volumen de código fuente es inferior a 50 KLOC ($11.62 \text{ KLOC}$).
- Las interfaces y el problema de dominio (derecho laboral boliviano) fueron delimitados mediante especificación de requerimientos funcionalmente acotados.

Las ecuaciones matemáticas del modelo COCOMO Básico para el modo orgánico son:

$$\text{Esfuerzo } (E) = a \cdot (KLOC)^b \quad [\text{Personas-Mes (PM)}]$$

$$\text{Tiempo de Desarrollo } (TDEV) = c \cdot (E)^d \quad [\text{Meses}]$$

$$\text{Personal Promedio Requerido } (SS) = \frac{E}{TDEV} \quad [\text{Personas}]$$

$$\text{Productividad } (P) = \frac{LOC}{E} \quad [\text{LOC / PM}]$$

Donde los coeficientes para el modo orgánico corresponden a:
- $a = 2.4$
- $b = 1.05$
- $c = 2.5$
- $d = 0.38$

#### Cálculo del Esfuerzo ($E$):
$$E = 2.4 \cdot (11.62)^{1.05}$$
$$11.62^{1.05} \approx 13.135$$
$$E = 2.4 \cdot 13.135 = \mathbf{31.52 \text{ Personas-Mes (PM)}}$$

#### Cálculo del Tiempo de Desarrollo Teórico ($TDEV$):
$$TDEV = 2.5 \cdot (31.52)^{0.38}$$
$$31.52^{0.38} \approx 3.71$$
$$TDEV = 2.5 \cdot 3.71 = \mathbf{9.28 \text{ meses}}$$

#### Cálculo del Personal Nominal Requerido ($SS$):
$$SS = \frac{E}{TDEV} = \frac{31.52}{9.28} = \mathbf{3.40 \text{ personas}}$$

#### Cálculo de la Productividad ($P$):
$$P = \frac{11,620 \text{ LOC}}{31.52 \text{ PM}} = \mathbf{368.65 \text{ LOC / Persona-Mes}}$$

---

### 4.2.3. Distribución del Esfuerzo por Fases del Ciclo de Vida del Software

De acuerdo con la distribución porcentual establecida por Barry Boehm para proyectos orgánicos, el esfuerzo total de $31.52 \text{ PM}$ se distribuye en las siguientes fases:

#### Tabla 4.2. Distribución de Esfuerzo COCOMO por Fases
| Fase de Desarrollo | Porcentaje (%) | Esfuerzo Teórico (Personas-Mes) |
| :--- | :---: | :---: |
| 1. Análisis de Requisitos y Factibilidad | 16 % | 5.04 PM |
| 2. Diseño de Arquitectura y Base de Datos | 16 % | 5.04 PM |
| 3. Implementación y Programación (Frontend/Backend) | 45 % | 14.18 PM |
| 4. Pruebas, Integración y Seguridad | 15 % | 4.73 PM |
| 5. Documentación Técnica y Cierre de Proyecto | 8 % | 2.53 PM |
| **TOTAL** | **100 %** | **31.52 PM** |

---

### 4.2.4. Adaptación al Cronograma Real del Proyecto de Grado y Tarifas Salariales

En el ámbito del proyecto de titulación universitaria, la investigación y el desarrollo de software son ejecutados por el equipo de tesistas (actuando en los roles especializados de **Analista de Sistemas / Diseñador**, **Desarrollador Full-Stack** y **Tester / Documentador**) a lo largo de un período intensivo de desarrollo de **6 meses** calendario (24 semanas lectivas).

Para la estimación financiera se consideran las siguientes referencias salariales en Bolivia:
1. **Salario Mínimo Nacional:** Regulado por el Gobierno Central de Bolivia mediante Decreto Supremo en Bs. 2,500 mensuales.
2. **Salario Promedio de Desarrollador de Software:** Según estudios de mercado laboral tecnológico en Bolivia y plataformas especializadas (Glassdoor, 2023-2024), el salario promedio para un Ingeniero de Software / Desarrollador Full-Stack se sitúa en **Bs. 5,625 mensuales** ($\approx 808.19 \text{ USD/mes}$, a un tipo de cambio de 6.96).
3. **Salario Promedio de Analista de Sistemas / Documentador:** Estimado en **Bs. 3,500 mensuales** ($\approx 502.87 \text{ USD/mes}$).

A continuación, la Tabla 4.3 detalla el presupuesto asignado por concepto de personal durante el ciclo de vida real del proyecto:

#### Tabla 4.3. Presupuesto del Costo de Personal por Fases y Roles
| Fase de Desarrollo del Proyecto | Rol Desempeñado | N° de Personas | Tiempo Invertido (Meses) | Costo Mensual por Persona (USD) | Costo Mensual por Persona (BOB) | Subtotal (USD) | Subtotal (BOB) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Análisis y Requisitos** | Analista de Sistemas | 2 | 1.0 | 502.87 | 3,500.00 | 1,005.74 | 7,000.00 |
| **Diseño y Modelado** | Arquitecto de Software / BD | 2 | 1.0 | 502.87 | 3,500.00 | 1,005.74 | 7,000.00 |
| **Implementación y Código** | Desarrollador Full-Stack | 2 | 2.5 | 808.19 | 5,625.00 | 4,040.95 | 28,125.00 |
| **Pruebas y Seguridad** | Especialista QA / Tester | 2 | 1.0 | 808.19 | 5,625.00 | 1,616.38 | 11,250.00 |
| **Documentación y Cierre** | Documentador Técnico | 2 | 0.5 | 502.87 | 3,500.00 | 502.87 | 3,500.00 |
| **TOTAL COSTO PERSONAL** | — | — | **6.0 meses** | — | — | **$8,171.68** | **Bs. 56,875.00** |

*Fuente: Elaboración propia en base a fórmulas de COCOMO y baremos salariales de Bolivia (2024-2026).*

---

## 4.3. COSTO DE VIAJE Y VIÁTICOS

Para garantizar la pertinencia legal y funcionalidad del sistema, fue imprescindible realizar desplazamientos y trabajo de campo orientado a:
1. Recopilar y validar la normativa laboral vigente y criterios de liquidación de finiquitos mediante reuniones con abogados laboralistas y especialistas en derecho del trabajo.
2. Traslados hacia oficinas del Ministerio de Trabajo, Empleo y Previsión Social de Bolivia y juzgados laborales para cotejar formularios oficiales de beneficios sociales.
3. Asistencia presencial periódica a los predios universitarios para sesiones de revisión y validación de avance con los docentes revisores, tutor metodológico y tribunal examinador.

Los gastos de pasajes en transporte público, traslados urbanos y viáticos menores se detallan en la Tabla 4.4:

#### Tabla 4.4. Costo de Viaje y Viáticos
| Concepto / Detalle | Unidad | Cantidad | Costo Unitario (BOB) | Costo Unitario (USD) | Subtotal (BOB) | Subtotal (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Pasajes urbanos a la Universidad (Revisiones y Asesorías) | Viaje | 120 | 4.00 | 0.57 | 480.00 | 68.97 |
| Traslados para entrevistas con Abogados y Expertos | Viaje | 40 | 5.00 | 0.72 | 200.00 | 28.74 |
| Traslados a instituciones públicas laborales | Viaje | 25 | 6.00 | 0.86 | 150.00 | 21.55 |
| Viáticos de refrigerio durante jornadas de trabajo de campo | Jornada | 30 | 20.00 | 2.87 | 600.00 | 86.21 |
| **TOTAL COSTO DE VIAJES Y VIÁTICOS** | — | — | — | — | **Bs. 1,430.00** | **$205.47** |

*Fuente: Elaboración propia.*

---

## 4.4. COSTO DE ALOJAMIENTO DEL PROYECTO

El sistema **Consulta Laboral Bolivia** requiere una infraestructura en la nube robusta, escalable y con soporte para tecnologías de Inteligencia Artificial moderna, específicamente:
- Un entorno de ejecución para el servidor Node.js/Express.
- Alojamiento web optimizado para la aplicación frontend construida con React y Vite.
- Un motor de base de datos PostgreSQL con soporte nativo de la extensión `pgvector` para el almacenamiento y búsqueda de similitud por cosenos de los fragmentos de la Ley General del Trabajo y jurisprudencia.
- Consumo de la API de OpenAI para la generación de respuestas contextualizadas (`gpt-4o-mini`) y la vectorización de documentos legales (`text-embedding-3-small`).
- Registro de nombre de dominio y certificado de seguridad SSL/TLS para navegación cifrada bajo protocolo HTTPS.

En la Tabla 4.5 se detalla la estimación anualizada de los costos de alojamiento y servicios de infraestructura tecnológica:

#### Tabla 4.5. Costo de Alojamiento del Proyecto e Infraestructura Tecnológica (1 Año)
| Componente / Servicio | Proveedor / Especificación | Período | Costo Unitario Mensual (USD) | Costo Anual (USD) | Costo Anual (BOB) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Servidor de Aplicación (Backend & Frontend)** | Servidor VPS en la nube (2 vCPU, 4GB RAM, 80GB SSD NVMe) | 12 meses | 12.00 | 144.00 | 1,002.24 |
| **Servicio de Base de Datos PostgreSQL + pgvector** | Base de datos administrada en la nube con soporte de índices vectoriales | 12 meses | 15.00 | 180.00 | 1,252.80 |
| **Nombre de Dominio Oficial** | Dominio de internet institucional (`.bo` / `.com`) | 1 año | — | 35.00 | 243.60 |
| **Certificado SSL / Protección DNS** | Cifrado SSL wildcard y mitigación DDoS Cloudflare | 1 año | 0.00 (Gratuito) | 0.00 | 0.00 |
| **Consumo de OpenAI API (Embeddings & Chat)** | Modelo `text-embedding-3-small` (vectorización) + `gpt-4o-mini` (consultas laborales) | 12 meses | 10.00 | 120.00 | 835.20 |
| **TOTAL ALOJAMIENTO E INFRAESTRUCTURA** | — | **1 año** | — | **$479.00** | **Bs. 3,333.84** |

*Fuente: Elaboración propia en base a tarifas oficiales de proveedores cloud (2024-2026).*

---

## 4.5. COSTO TOTAL

Para presentar el balance económico integral del proyecto, se adiciona el rubro de **Costos de Consumibles y Materiales de Escritorio** (papel bond, impresiones de borradores para revisión docente, anillados y encuadernaciones empastadas oficiales exigidas por la reglamentación universitaria).

#### Tabla 4.6. Costo de Consumibles y Materiales de Escritorio
| Material / Insumo | Unidad | Cantidad | Costo Unitario (BOB) | Subtotal (BOB) | Subtotal (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Hojas de Papel Bond A4 (75g) | Resma (500 hojas) | 3 | 35.00 | 105.00 | 15.09 |
| Tinta / Tóner de Impresión | Recarga / Cartucho | 2 | 80.00 | 160.00 | 22.99 |
| Fotocopias y Anillados de Borradores | Ejemplares | 5 | 25.00 | 125.00 | 17.96 |
| Empastados Oficiales de Grado con letras doradas | Libro Empastado | 4 | 75.00 | 300.00 | 43.10 |
| Materiales de escritorio menores (archivadores, bolígrafos) | Varios | 1 | 60.00 | 60.00 | 8.62 |
| **TOTAL CONSUMIBLES Y MATERIALES** | — | — | — | **Bs. 750.00** | **$107.76** |

---

### Resumen Consolidado del Presupuesto

El costo total estimado para el desarrollo, pruebas, puesta en marcha y operación anual del sistema **"Consulta Laboral Bolivia"** se consolida en la Tabla 4.7:

#### Tabla 4.7. Presupuesto y Costo Total del Proyecto
| Categoría de Costo | Costo Total (USD) | Costo Total (BOB) | Porcentaje de Participación (%) |
| :--- | :---: | :---: | :---: |
| **4.2. Costo del Personal (COCOMO)** | $8,171.68 | Bs. 56,875.00 | 87.89 % |
| **4.3. Costo de Viaje y Viáticos** | $205.47 | Bs. 1,430.00 | 2.21 % |
| **4.4. Costo de Alojamiento del Proyecto** | $479.00 | Bs. 3,333.84 | 5.15 % |
| **Costo de Consumibles y Materiales** | $107.76 | Bs. 750.00 | 1.16 % |
| **Imprevistos y Contingencias (3.5%)** | $314.00 | Bs. 2,185.42 | 3.59 % |
| **TOTAL GENERAL DEL PROYECTO** | **$9,277.91** | **Bs. 64,574.26** | **100.00 %** |

*Tipo de cambio utilizado: 1 USD = 6.96 BOB.*  
*Fuente: Elaboración propia.*

---

### 4.5.1. Conclusiones de la Estimación Económica

1. **Predominancia del Talento Humano:** El costo de personal representa el **87.89%** del presupuesto global, lo cual es plenamente congruente con los estándares de la ingeniería de software, donde el recurso más valioso y determinante es el esfuerzo intelectual de los profesionales dedicados al análisis, arquitectura, codificación y pruebas.
2. **Precisión Mediante COCOMO:** La medición objetiva de las **11,620 líneas de código fuente (11.62 KLOC)** permitió aplicar de forma fidedigna las ecuaciones de Barry Boehm, demostrando que un proyecto de esta envergadura técnica (integrando inteligencia artificial generativa, bases vectoriales y cálculo laboral complejo) requiere un esfuerzo teórico de **31.52 personas-mes**, adaptado exitosamente a la dinámica universitaria de desarrollo intensivo.
3. **Sostenibilidad del Alojamiento:** Los costos de infraestructura y alojamiento en la nube representan apenas el **5.15%** del presupuesto total anual ($479.00 USD), demostrando que la arquitectura seleccionada (React, Node.js y PostgreSQL con pgvector) es económicamente viable y altamente accesible para su mantenimiento operativo a largo plazo.
