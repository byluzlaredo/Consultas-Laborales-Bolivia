/**
 * Motor de Cálculo Especializado de Beneficios Sociales y Finiquitos
 * Legislación Boliviana: LGT, D.S. 110, D.S. 28699, Ley de Aguinaldo 1944
 */

export interface BenefitsCalculationInput {
  fechaIngreso: string; // DD/MM/YYYY
  fechaRetiro: string; // DD/MM/YYYY
  motivo: 'Despido Injustificado' | 'Renuncia Voluntaria' | 'Despido Justificado';
  salarioMes1: number; // Último mes
  salarioMes2: number; // Penúltimo mes
  salarioMes3: number; // Antepenúltimo mes
  diasVacacionesPendientes: number;
}

export interface BenefitsCalculationOutput {
  // Parámetros de entrada
  trabajador?: string;
  motivo: string;
  fechaIngreso: string;
  fechaRetiro: string;
  tiempoServicio: {
    anos: number;
    meses: number;
    dias: number;
    totalDiasComerciales: number;
  };
  remuneraciones: {
    mes1: number;
    mes2: number;
    mes3: number;
    sumatoria: number;
  };
  
  // Base de cálculo
  spi: number; // Sueldo Promedio Indemnizable
  salarioDiario: number; // SPI / 30
  salarioDiarioComercial: number; // SPI / 360

  // Detalles de cálculo
  indemnizacion: {
    porAnos: number;
    porMeses: number;
    porDias: number;
    subtotal: number;
  };
  desahucio: {
    aplica: boolean;
    razon: string;
    subtotal: number;
  };
  aguinaldo: {
    mesesEnGestion: number;
    diasEnGestion: number;
    porMeses: number;
    porDias: number;
    subtotal: number;
  };
  vacaciones: {
    diasPendientes: number;
    subtotal: number;
  };

  // Totales
  totalFiniquito: number;
  totalEnLetras: string;
  
  // Validaciones
  requiereValidacion: boolean;
  avisos: string[];
}

export const INVALID_BENEFITS_INPUT_MESSAGE = 'Ingrese fechas y montos válidos para realizar el cálculo';

export function validateBenefitsInput(input: BenefitsCalculationInput): { valid: boolean; message?: string } {
  const datePattern = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  const datesAreValid = [input.fechaIngreso, input.fechaRetiro].every((value) => datePattern.test(value));
  const salariesAreValid = [input.salarioMes1, input.salarioMes2, input.salarioMes3]
    .every((value) => Number.isFinite(value) && value > 0);
  const vacationDaysAreValid = Number.isFinite(input.diasVacacionesPendientes) && input.diasVacacionesPendientes >= 0;

  if (!datesAreValid || !salariesAreValid || !vacationDaysAreValid) {
    return { valid: false, message: INVALID_BENEFITS_INPUT_MESSAGE };
  }

  const ingreso = parseFecha(input.fechaIngreso);
  const retiro = parseFecha(input.fechaRetiro);
  const [ingresoDia, ingresoMes, ingresoAno] = input.fechaIngreso.split('/').map(Number);
  const [retiroDia, retiroMes, retiroAno] = input.fechaRetiro.split('/').map(Number);
  const datesWereNormalized = ingreso.getDate() !== ingresoDia
    || ingreso.getMonth() + 1 !== ingresoMes
    || ingreso.getFullYear() !== ingresoAno
    || retiro.getDate() !== retiroDia
    || retiro.getMonth() + 1 !== retiroMes
    || retiro.getFullYear() !== retiroAno;
  if (datesWereNormalized) return { valid: false, message: INVALID_BENEFITS_INPUT_MESSAGE };
  if (retiro <= ingreso) return { valid: false, message: INVALID_BENEFITS_INPUT_MESSAGE };

  return { valid: true };
}

/**
 * Convierte una fecha DD/MM/YYYY a objeto Date
 */
function parseFecha(fecha: string): Date {
  const [dia, mes, ano] = fecha.split('/').map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Convierte una fecha en formato ISO a DD/MM/YYYY
 */
function formatFecha(date: Date): string {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Calcula el tiempo de servicio usando año comercial (360 días)
 */
function calcularTiempoServicio(
  fechaIngreso: Date,
  fechaRetiro: Date
): { anos: number; meses: number; dias: number; totalDiasComerciales: number } {
  let dias = fechaIngreso.getDate();
  let meses = fechaIngreso.getMonth();
  let anos = fechaIngreso.getFullYear();

  const diaRetiro = fechaRetiro.getDate();
  const mesRetiro = fechaRetiro.getMonth();
  const anoRetiro = fechaRetiro.getFullYear();

  // Calcular diferencia de años
  let anosDiff = anoRetiro - anos;
  // Calcular diferencia de meses
  let mesesDiff = mesRetiro - meses;
  // Calcular diferencia de días
  let diasDiff = diaRetiro - dias;

  // Ajustar si es necesario
  if (diasDiff < 0) {
    mesesDiff -= 1;
    diasDiff += 30; // Año comercial = 30 días/mes
  }

  if (mesesDiff < 0) {
    anosDiff -= 1;
    mesesDiff += 12;
  }

  const totalDiasComerciales = anosDiff * 360 + mesesDiff * 30 + diasDiff;

  return {
    anos: anosDiff,
    meses: mesesDiff,
    dias: diasDiff,
    totalDiasComerciales,
  };
}

/**
 * Calcula el Sueldo Promedio Indemnizable (SPI)
 */
function calcularSPI(salario1: number, salario2: number, salario3: number): number {
  return (salario1 + salario2 + salario3) / 3;
}

/**
 * Calcula la Indemnización por Tiempo de Servicios (Art. 13 LGT, D.S. 110)
 */
function calcularIndemnizacion(
  spi: number,
  anos: number,
  meses: number,
  dias: number,
  totalDiasComerciales: number
): { porAnos: number; porMeses: number; porDias: number; subtotal: number; avisos: string[] } {
  const avisos: string[] = [];

  // Validar mínimo de 90 días
  if (totalDiasComerciales < 90) {
    avisos.push('⚠️ Advertencia: Menos de 90 días trabajados. No corresponde indemnización por tiempo de servicios.');
    return {
      porAnos: 0,
      porMeses: 0,
      porDias: 0,
      subtotal: 0,
      avisos,
    };
  }

  const porAnos = spi * anos;
  const porMeses = (spi / 12) * meses;
  const porDias = (spi / 360) * dias;
  const subtotal = porAnos + porMeses + porDias;

  return {
    porAnos: Math.round(porAnos * 100) / 100,
    porMeses: Math.round(porMeses * 100) / 100,
    porDias: Math.round(porDias * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    avisos,
  };
}

/**
 * Calcula el Desahucio (Art. 12 LGT, D.S. 28699)
 */
function calcularDesahucio(
  spi: number,
  motivo: string
): { aplica: boolean; razon: string; subtotal: number } {
  if (motivo === 'Despido Injustificado') {
    return {
      aplica: true,
      razon: 'Corresponde desahucio por despido injustificado (omisión de preaviso).',
      subtotal: Math.round(spi * 3 * 100) / 100,
    };
  }

  return {
    aplica: false,
    razon:
      motivo === 'Renuncia Voluntaria'
        ? 'No aplica desahucio en renuncia voluntaria.'
        : 'No aplica desahucio en despido justificado (Art. 16 LGT).',
    subtotal: 0,
  };
}

/**
 * Calcula el Aguinaldo proporcional de Navidad (Ley 18/12/1944)
 */
function calcularAguinaldo(
  spi: number,
  fechaIngreso: Date,
  fechaRetiro: Date,
  totalDiasComerciales: number
): {
  mesesEnGestion: number;
  diasEnGestion: number;
  porMeses: number;
  porDias: number;
  subtotal: number;
  avisos: string[];
} {
  const avisos: string[] = [];

  // Determinar si hay meses en la gestión actual (año civil)
  const anoGestion = fechaRetiro.getFullYear();
  const inicioGestion = new Date(anoGestion, 0, 1); // 1 de enero del año en curso

  let fechaInicio = fechaIngreso;
  if (fechaIngreso.getFullYear() === anoGestion && fechaIngreso.getMonth() !== 0) {
    fechaInicio = fechaIngreso;
  } else if (fechaIngreso.getFullYear() < anoGestion) {
    fechaInicio = inicioGestion;
  }

  const tiempoEnGestion = calcularTiempoServicio(fechaInicio, fechaRetiro);
  const mesesEnGestion = tiempoEnGestion.anos * 12 + tiempoEnGestion.meses;
  const diasEnGestion = tiempoEnGestion.dias;

  // Validar mínimo de 3 meses en la gestión
  const totalDiasEnGestion = tiempoEnGestion.totalDiasComerciales;
  if (totalDiasEnGestion < 90) {
    avisos.push('⚠️ Advertencia: Menos de 3 meses trabajados en la gestión. Aguinaldo puede no aplicar completamente.');
  }

  const porMeses = (spi / 12) * mesesEnGestion;
  const porDias = (spi / 360) * diasEnGestion;
  const subtotal = porMeses + porDias;

  return {
    mesesEnGestion,
    diasEnGestion,
    porMeses: Math.round(porMeses * 100) / 100,
    porDias: Math.round(porDias * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    avisos,
  };
}

/**
 * Calcula las Vacaciones No Gozadas (Art. 44 LGT)
 */
function calcularVacaciones(
  spi: number,
  diasPendientes: number
): { diasPendientes: number; subtotal: number } {
  const salarioDiario = spi / 30;
  const subtotal = salarioDiario * diasPendientes;

  return {
    diasPendientes,
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

/**
 * Convierte un número a letras en español
 */
function numberToWords(num: number): string {
  const unidades = ['', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
  const decenas = ['', '', 'Veinte', 'Treinta', 'Cuarenta', 'Cincuenta', 'Sesenta', 'Setenta', 'Ochenta', 'Noventa'];
  const centenas = ['', 'Ciento', 'Doscientos', 'Trescientos', 'Cuatrocientos', 'Quinientos', 'Seiscientos', 'Setecientos', 'Ochocientos', 'Novecientos'];

  const entero = Math.floor(num);
  const decimales = Math.round((num - entero) * 100);

  function convertirGrupo(n: number): string {
    if (n === 0) return '';

    let resultado = '';

    const c = Math.floor(n / 100);
    if (c > 0) {
      resultado += centenas[c];
    }

    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;

    if (d === 1) {
      const speciales = ['Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve'];
      if (resultado) resultado += ' ';
      resultado += speciales[u];
    } else {
      if (d > 0) {
        if (resultado) resultado += ' ';
        resultado += decenas[d];
        if (u > 0) resultado += ' y ' + unidades[u];
      } else if (u > 0) {
        if (resultado) resultado += ' ';
        resultado += unidades[u];
      }
    }

    return resultado;
  }

  let palabras = '';
  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    const resto = entero % 1000000;
    palabras = millones === 1 ? 'Un Millón' : `${convertirGrupo(millones)} Millones`;
    if (resto > 0) palabras += ` ${resto >= 1000 ? `${convertirGrupo(Math.floor(resto / 1000))} Mil` : convertirGrupo(resto)}`;
    if (resto >= 1000 && resto % 1000 > 0) palabras += ` ${convertirGrupo(resto % 1000)}`;
  } else if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    palabras = miles === 1 ? 'Mil' : `${convertirGrupo(miles)} Mil`;
    if (resto > 0) palabras += ` ${convertirGrupo(resto)}`;
  } else {
    palabras = convertirGrupo(entero);
  }
  if (!palabras) palabras = 'Cero';

  // Pluralizar si es necesario
  if (entero === 1) {
    palabras = palabras.replace('Uno', 'Un');
  }

  return `${palabras} Bolivianos ${decimales.toString().padStart(2, '0')}/100`;
}

/**
 * Función principal de cálculo
 */
export function calcularBeneficios(input: BenefitsCalculationInput): BenefitsCalculationOutput {
  const avisos: string[] = [];

  const validation = validateBenefitsInput(input);
  if (!validation.valid) throw new Error(validation.message || INVALID_BENEFITS_INPUT_MESSAGE);

  // Parsear fechas
  const fechaIngreso = parseFecha(input.fechaIngreso);
  const fechaRetiro = parseFecha(input.fechaRetiro);

  // Calcular tiempo de servicio
  const tiempoServicio = calcularTiempoServicio(fechaIngreso, fechaRetiro);

  // Calcular SPI
  const spi = calcularSPI(input.salarioMes1, input.salarioMes2, input.salarioMes3);

  // Calcular remuneraciones
  const remuneraciones = {
    mes1: input.salarioMes1,
    mes2: input.salarioMes2,
    mes3: input.salarioMes3,
    sumatoria: input.salarioMes1 + input.salarioMes2 + input.salarioMes3,
  };

  // Calcular componentes
  const indemnizacionData = calcularIndemnizacion(
    spi,
    tiempoServicio.anos,
    tiempoServicio.meses,
    tiempoServicio.dias,
    tiempoServicio.totalDiasComerciales
  );
  avisos.push(...indemnizacionData.avisos);

  const desahucioData = calcularDesahucio(spi, input.motivo);

  const aguinaldoData = calcularAguinaldo(spi, fechaIngreso, fechaRetiro, tiempoServicio.totalDiasComerciales);
  avisos.push(...aguinaldoData.avisos);

  const vacacionesData = calcularVacaciones(spi, input.diasVacacionesPendientes);

  // Calcular total
  const totalFiniquito =
    indemnizacionData.subtotal + desahucioData.subtotal + aguinaldoData.subtotal + vacacionesData.subtotal;

  return {
    motivo: input.motivo,
    fechaIngreso: input.fechaIngreso,
    fechaRetiro: input.fechaRetiro,
    tiempoServicio,
    remuneraciones,
    spi: Math.round(spi * 100) / 100,
    salarioDiario: Math.round((spi / 30) * 100) / 100,
    salarioDiarioComercial: Math.round((spi / 360) * 100) / 100,
    indemnizacion: indemnizacionData,
    desahucio: desahucioData,
    aguinaldo: aguinaldoData,
    vacaciones: vacacionesData,
    totalFiniquito: Math.round(totalFiniquito * 100) / 100,
    totalEnLetras: numberToWords(totalFiniquito),
    requiereValidacion: avisos.length > 0,
    avisos,
  };
}

/**
 * Genera el informe formateado
 */
export function generarInforme(output: BenefitsCalculationOutput): string {
  const linea = '='.repeat(80);

  let informe = `
${linea}
           INFORME TÉCNICO Y EXTRACTO DE FINIQUITO LABORAL (BOLIVIA)
${linea}

1. RESUMEN EJECUTIVO Y PARAMÉTRICO
${'-'.repeat(80)}
• Motivo del Retiro: ${output.motivo}
• Fecha de Ingreso: ${output.fechaIngreso} | Fecha de Retiro: ${output.fechaRetiro}
• Tiempo de Servicio Computado: ${output.tiempoServicio.anos} Años, ${output.tiempoServicio.meses} Meses y ${output.tiempoServicio.dias} Días (${output.tiempoServicio.totalDiasComerciales} días comerciales)
• Remuneraciones tomadas en cuenta:
  - Mes 1: ${output.remuneraciones.mes1.toFixed(2)} BS | Mes 2: ${output.remuneraciones.mes2.toFixed(2)} BS | Mes 3: ${output.remuneraciones.mes3.toFixed(2)} BS
  - Sumatorio 3 Últimos Meses: ${output.remuneraciones.sumatoria.toFixed(2)} BS
• Base Calculada (Sueldo Promedio Indemnizable - SPI): ${output.spi.toFixed(2)} BS
• Factor Salario Diario (SPI / 30): ${output.salarioDiario.toFixed(2)} BS/día

2. DETALLE MATEMÁTICO Y FUNDAMENTACIÓN JURÍDICA PASO A PASO
${'-'.repeat(80)}

A. DETERMINACIÓN DEL SUELDO PROMEDIO INDEMNIZABLE (SPI)
   Fórmula: (S1 + S2 + S3) / 3
   Desarrollo: (${output.remuneraciones.mes1.toFixed(2)} + ${output.remuneraciones.mes2.toFixed(2)} + ${output.remuneraciones.mes3.toFixed(2)}) / 3
   Resultado: ${output.spi.toFixed(2)} BS.

B. INDEMNIZACIÓN POR TIEMPO DE SERVICIOS (Art. 13 LGT, D.S. 110)
   - Cómputo por Años (${output.tiempoServicio.anos} años): ${output.spi.toFixed(2)} × ${output.tiempoServicio.anos} = ${output.indemnizacion.porAnos.toFixed(2)} BS.
   - Cómputo por Meses (${output.tiempoServicio.meses} meses): (${output.spi.toFixed(2)} / 12) × ${output.tiempoServicio.meses} = ${output.indemnizacion.porMeses.toFixed(2)} BS.
   - Cómputo por Días (${output.tiempoServicio.dias} días): (${output.spi.toFixed(2)} / 360) × ${output.tiempoServicio.dias} = ${output.indemnizacion.porDias.toFixed(2)} BS.
   SUBTOTAL INDEMNIZACIÓN: ${output.indemnizacion.subtotal.toFixed(2)} BS.

C. DESAHUCIO (Art. 12 LGT, D.S. 28699)
   - Causal Evaluada: ${output.desahucio.razon}
   - Cálculo: ${output.desahucio.aplica ? `${output.spi.toFixed(2)} × 3 = ${output.desahucio.subtotal.toFixed(2)}` : 'No aplica (0.00)'} BS.
   SUBTOTAL DESAHUCIO: ${output.desahucio.subtotal.toFixed(2)} BS.

D. AGUINALDO PROPORCIONAL DE NAVIDAD (Ley de 18/12/1944)
   - Período computado en la gestión: ${output.aguinaldo.mesesEnGestion} meses y ${output.aguinaldo.diasEnGestion} días.
   - Proporcional Meses: (${output.spi.toFixed(2)} / 12) × ${output.aguinaldo.mesesEnGestion} = ${output.aguinaldo.porMeses.toFixed(2)} BS.
   - Proporcional Días: (${output.spi.toFixed(2)} / 360) × ${output.aguinaldo.diasEnGestion} = ${output.aguinaldo.porDias.toFixed(2)} BS.
   SUBTOTAL AGUINALDO: ${output.aguinaldo.subtotal.toFixed(2)} BS.

E. VACACIONES PENDIENTES NO GOZADAS (Art. 44 LGT)
   - Días computados: ${output.vacaciones.diasPendientes} días adeudados.
   - Cálculo: (${output.spi.toFixed(2)} / 30) × ${output.vacaciones.diasPendientes} = ${output.vacaciones.subtotal.toFixed(2)} BS.
   SUBTOTAL VACACIONES: ${output.vacaciones.subtotal.toFixed(2)} BS.

${'-'.repeat(80)}
3. EXTRACTO OFICIAL Y RESUMEN DE LIQUIDACIÓN DE BENEFICIOS SOCIALES
${'-'.repeat(80)}

+--------------------------------------------------+-----------------------+
| CONCEPTO / RUBRO LABORAL                         | IMPORTE A PAGAR (BS)  |
+--------------------------------------------------+-----------------------+
| 1. Indemnización por Tiempo de Servicios         | ${output.indemnizacion.subtotal.toFixed(2).padStart(20)}  |
| 2. Desahucio (Tres sueldos por despido)          | ${output.desahucio.subtotal.toFixed(2).padStart(20)}  |
| 3. Aguinaldo Proporcional de Navidad             | ${output.aguinaldo.subtotal.toFixed(2).padStart(20)}  |
| 4. Compensación de Vacaciones No Gozadas         | ${output.vacaciones.subtotal.toFixed(2).padStart(20)}  |
| 5. Otros Conceptos / Sueldos Devengados          |                  0.00  |
+--------------------------------------------------+-----------------------+
| TOTAL LIQUIDACIÓN FINIQUITO (Monto Bruto)        | ${output.totalFiniquito.toFixed(2).padStart(20)}  |
+--------------------------------------------------+-----------------------+

Son: ${output.totalEnLetras}.

Nota Informativa: El presente cálculo constituye una estimación orientativa basada en la 
legislación laboral vigente en Bolivia y no reemplaza la revisión y visado formal por parte 
de las Jefaturas Departamentales de Trabajo del Ministerio de Trabajo, Empleo y Previsión Social.

${output.avisos.length > 0 ? `ADVERTENCIAS Y VALIDACIONES:\n${output.avisos.map((a: string) => `  ${a}`).join('\n')}\n` : ''}
${linea}
  `;

  return informe;
}
