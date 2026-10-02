# Ejemplo de Uso: Motor de Cálculo de Beneficios Sociales Bolivianos

## Ejemplo 1: Despido Injustificado - 3 años de trabajo

### Datos de Entrada:
```json
{
  "fechaIngreso": "15/01/2021",
  "fechaRetiro": "15/01/2024",
  "motivo": "Despido Injustificado",
  "salarioMes1": 3500.00,
  "salarioMes2": 3500.00,
  "salarioMes3": 3500.00,
  "diasVacacionesPendientes": 15
}
```

### Resultado Esperado:

**Cálculos Intermedios:**
- SPI: 3,500.00 BS
- Salario Diario: 116.67 BS (3500/30)
- Tiempo de Servicio: 3 años, 0 meses, 0 días

**Desglose de Rubros:**
- Indemnización por T.S.: 10,500.00 BS (3,500 × 3 años)
- Desahucio: 10,500.00 BS (3,500 × 3) ← APLICA por despido injustificado
- Aguinaldo Proporcional: 1,166.67 BS (3,500/12 × 12 meses)
- Vacaciones: 1,750.00 BS (116.67 × 15 días)

**TOTAL FINIQUITO: 23,916.67 BS**
(Veintitrés mil novecientos dieciséis con 67/100 Bolivianos)

---

## Ejemplo 2: Renuncia Voluntaria - 5 años de trabajo

### Datos de Entrada:
```json
{
  "fechaIngreso": "01/06/2019",
  "fechaRetiro": "01/06/2024",
  "motivo": "Renuncia Voluntaria",
  "salarioMes1": 2000.00,
  "salarioMes2": 1950.00,
  "salarioMes3": 1900.00,
  "diasVacacionesPendientes": 20
}
```

### Resultado Esperado:

**Cálculos Intermedios:**
- SPI: 1,950.00 BS (promedio de 3 meses)
- Salario Diario: 65.00 BS
- Tiempo de Servicio: 5 años, 0 meses, 0 días

**Desglose de Rubros:**
- Indemnización por T.S.: 9,750.00 BS (1,950 × 5 años)
- Desahucio: 0.00 BS ← NO APLICA en renuncia voluntaria
- Aguinaldo Proporcional: 1,950.00 BS
- Vacaciones: 1,300.00 BS (65 × 20 días)

**TOTAL FINIQUITO: 13,000.00 BS**
(Trece mil 00/100 Bolivianos)

---

## Ejemplo 3: Menos de 90 días (sin derecho a indemnización)

### Datos de Entrada:
```json
{
  "fechaIngreso": "01/10/2024",
  "fechaRetiro": "30/11/2024",
  "motivo": "Renuncia Voluntaria",
  "salarioMes1": 1200.00,
  "salarioMes2": 1200.00,
  "salarioMes3": 1200.00,
  "diasVacacionesPendientes": 0
}
```

### Resultado Esperado:

⚠️ **ADVERTENCIA:** Menos de 90 días trabajados. No corresponde indemnización.

**Cálculos Intermedios:**
- SPI: 1,200.00 BS
- Tiempo de Servicio: 0 años, 1 mes, 29 días (59 días totales)

**Desglose de Rubros:**
- Indemnización por T.S.: 0.00 BS ← SIN DERECHO (< 90 días)
- Desahucio: 0.00 BS
- Aguinaldo Proporcional: 100.00 BS (1,200/12 × 1 mes)
- Vacaciones: 0.00 BS

**TOTAL FINIQUITO: 100.00 BS**

---

## Prueba en la Aplicación

### Pasos:
1. Abre la aplicación en http://localhost:5173
2. Ve a "Calculadora de Beneficios Sociales"
3. Ingresa los datos del trabajador
4. Haz clic en "Calcular Finiquito"
5. Visualiza el desglose en la columna derecha
6. Descarga el PDF con el informe completo

### Campos Requeridos:
- ✅ Fecha de Ingreso (formato: DD/MM/YYYY)
- ✅ Fecha de Retiro (formato: DD/MM/YYYY)
- ✅ Motivo de Retiro (dropdown)
- ✅ Salarios últimos 3 meses
- ⚠️ Días de Vacaciones (opcional)

---

## Documentación Legal

El cálculo se fundamenta en:

1. **Ley General del Trabajo (LGT)**
   - Art. 13: Indemnización por tiempo de servicios
   - Art. 44: Vacaciones

2. **Decreto Supremo N° 110**
   - Regulación de indemnizaciones

3. **Decreto Supremo N° 28699**
   - Desahucio (3 sueldos por despido injustificado)

4. **Ley de Aguinaldo de 18/12/1944**
   - Cálculo del aguinaldo proporcional

---

## Notas Importantes

- ⚠️ El cálculo es **orientativo** y no reemplaza el visado formal de autoridades laborales
- 📋 Se recomienda verificar con la Jefatura Departamental de Trabajo
- 🔐 El monto se convierte a letras automáticamente
- 📊 El informe PDF incluye fundamentación jurídica completa
- 💾 Todos los cálculos se guardan en la base de datos para auditoría
