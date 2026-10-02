# Documentación API: Cálculo de Beneficios Sociales

## Endpoint: POST /api/laboral/calculations

Calcula beneficios sociales y liquidación (finiquito) según normativa laboral boliviana.

### Request

**URL:** `http://localhost:3001/api/laboral/calculations`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fechaIngreso": "DD/MM/YYYY",
  "fechaRetiro": "DD/MM/YYYY",
  "motivo": "Renuncia Voluntaria|Despido Injustificado|Despido Justificado",
  "salarioMes1": 2500.50,
  "salarioMes2": 2500.50,
  "salarioMes3": 2500.50,
  "diasVacacionesPendientes": 15,
  "userId": 1
}
```

### Parámetros

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaIngreso` | string | ✅ | Fecha de contratación (DD/MM/YYYY) |
| `fechaRetiro` | string | ✅ | Fecha de separación (DD/MM/YYYY) |
| `motivo` | string | ✅ | Causal del retiro: "Renuncia Voluntaria", "Despido Injustificado", "Despido Justificado" |
| `salarioMes1` | number | ✅ | Sueldo del mes más reciente (BS) |
| `salarioMes2` | number | ✅ | Sueldo del segundo mes anterior (BS) |
| `salarioMes3` | number | ✅ | Sueldo del tercer mes anterior (BS) |
| `diasVacacionesPendientes` | number | ❌ | Días no disfrutados (default: 0) |
| `userId` | number | ❌ | ID del usuario para auditoría (default: 1) |

### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "calculationId": 42,
    "resultado": {
      "motivo": "Despido Injustificado",
      "fechaIngreso": "15/01/2021",
      "fechaRetiro": "15/01/2024",
      "tiempoServicio": {
        "anos": 3,
        "meses": 0,
        "dias": 0,
        "totalDiasComerciales": 1080
      },
      "remuneraciones": {
        "mes1": 3500.00,
        "mes2": 3500.00,
        "mes3": 3500.00,
        "sumatoria": 10500.00
      },
      "spi": 3500.00,
      "salarioDiario": 116.67,
      "salarioDiarioComercial": 9.72,
      "indemnizacion": {
        "porAnos": 10500.00,
        "porMeses": 0.00,
        "porDias": 0.00,
        "subtotal": 10500.00
      },
      "desahucio": {
        "aplica": true,
        "razon": "Corresponde desahucio por despido injustificado (omisión de preaviso).",
        "subtotal": 10500.00
      },
      "aguinaldo": {
        "mesesEnGestion": 12,
        "diasEnGestion": 0,
        "porMeses": 3500.00,
        "porDias": 0.00,
        "subtotal": 3500.00
      },
      "vacaciones": {
        "diasPendientes": 15,
        "subtotal": 1750.00
      },
      "totalFiniquito": 26250.00,
      "totalEnLetras": "Veintiséis mil doscientos cincuenta Bolivianos 00/100",
      "avisos": []
    },
    "informe": "[Informe detallado en formato texto]"
  }
}
```

### Response - Error (400 Bad Request)

```json
{
  "success": false,
  "message": "Los montos salariales deben ser mayores a cero"
}
```

### Response - Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "No se pudo procesar el cálculo de beneficios."
}
```

---

## Estructura de Respuesta Detallada

### resultado.tiempoServicio
Cálculo de antigüedad usando año comercial (360 días).

```json
{
  "anos": 3,
  "meses": 2,
  "dias": 15,
  "totalDiasComerciales": 1185
}
```

### resultado.indemnizacion
Cálculo según Art. 13 LGT y D.S. 110. Requiere mínimo 90 días.

```json
{
  "porAnos": 7000.00,
  "porMeses": 583.33,
  "porDias": 97.22,
  "subtotal": 7680.55
}
```

### resultado.desahucio
Se aplica solo si `motivo == "Despido Injustificado"`. Fórmula: `SPI × 3`.

```json
{
  "aplica": true,
  "razon": "Corresponde desahucio por despido injustificado...",
  "subtotal": 10500.00
}
```

### resultado.aguinaldo
Proporcional desde 1 de enero del año civil. Mínimo 3 meses en gestión.

```json
{
  "mesesEnGestion": 6,
  "diasEnGestion": 15,
  "porMeses": 1750.00,
  "porDias": 40.83,
  "subtotal": 1790.83
}
```

### resultado.vacaciones
Compensación por días no disfrutados. Fórmula: `(SPI/30) × diasPendientes`.

```json
{
  "diasPendientes": 15,
  "subtotal": 1750.00
}
```

---

## Validaciones

El endpoint valida:

✅ Fechas en formato DD/MM/YYYY
✅ Fecha de retiro > Fecha de ingreso
✅ Salarios positivos y válidos
✅ Motivo en valores permitidos
✅ Mínimo de 90 días para indemnización
✅ Mínimo de 3 meses en gestión para aguinaldo

---

## Ejemplos CURL

### Ejemplo 1: Despido Injustificado
```bash
curl -X POST http://localhost:3001/api/laboral/calculations \
  -H "Content-Type: application/json" \
  -d '{
    "fechaIngreso": "01/01/2020",
    "fechaRetiro": "31/12/2023",
    "motivo": "Despido Injustificado",
    "salarioMes1": 3000,
    "salarioMes2": 3000,
    "salarioMes3": 3000,
    "diasVacacionesPendientes": 20
  }'
```

### Ejemplo 2: Renuncia Voluntaria
```bash
curl -X POST http://localhost:3001/api/laboral/calculations \
  -H "Content-Type: application/json" \
  -d '{
    "fechaIngreso": "15/06/2019",
    "fechaRetiro": "15/06/2024",
    "motivo": "Renuncia Voluntaria",
    "salarioMes1": 2500,
    "salarioMes2": 2450,
    "salarioMes3": 2400,
    "diasVacacionesPendientes": 10
  }'
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Datos faltantes o inválidos |
| 400 | Salarios deben ser > 0 |
| 400 | Fecha de retiro debe ser posterior a ingreso |
| 500 | Error del servidor (BD, etc.) |

---

## Consideraciones Legales

⚠️ **IMPORTANTE:**

- El cálculo es **informativo y orientativo**
- No reemplaza revisión de autoridades laborales
- Debe validarse con Jefatura Departamental de Trabajo
- Fundamentado en leyes bolivianas vigentes
- Se guarda registro para auditoría en base de datos

---

## Base de Datos

Se guardan dos registros:

1. **calculo_laboral**
   - id_usuario
   - tipo_calculo (motivo)
   - salario (SPI)
   - fecha_ingreso
   - fecha_salida
   - resultado (total finiquito)

2. **detalle_calculo**
   - id_calculo (FK)
   - concepto (Indemnización, Desahucio, etc.)
   - monto
