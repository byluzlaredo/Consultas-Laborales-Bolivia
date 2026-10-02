import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { calcularBeneficios, generarInforme, INVALID_BENEFITS_INPUT_MESSAGE, validateBenefitsInput } from '../services/benefitsCalculationService';

const pool = new Pool({ connectionString: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema' });

const getAuthenticatedUserId = (req: Request): number => Number(req.user?.id);

const toDatabaseDate = (date: string): string => {
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
};

export const createLaborDocument = async (req: Request, res: Response): Promise<void> => {
  const { tipo, titulo, contenido, formato = 'PDF' } = req.body;
  const userId = getAuthenticatedUserId(req);
  if (!userId || !String(tipo ?? '').trim() || !String(titulo ?? '').trim() || !String(contenido ?? '').trim()) {
    res.status(400).json({ success: false, message: 'Complete todos los campos obligatorios para generar el documento' });
    return;
  }
  if (!['PDF', 'DOCX'].includes(String(formato).toUpperCase())) {
    res.status(400).json({ success: false, message: 'Error al procesar el archivo. Intente exportar nuevamente' });
    return;
  }
  try {
    const typeResult = await pool.query<{ id_tipo: number }>('SELECT id_tipo FROM tipo_documento WHERE nombre = $1 LIMIT 1', [String(tipo).trim()]);
    const typeId = typeResult.rows[0]?.id_tipo || (await pool.query<{ id_tipo: number }>('INSERT INTO tipo_documento (nombre) VALUES ($1) RETURNING id_tipo', [String(tipo).trim()])).rows[0].id_tipo;
    const result = await pool.query('INSERT INTO documento_laboral (id_usuario, id_tipo, titulo, contenido, formato) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, typeId, String(titulo).trim().slice(0, 255), String(contenido).trim(), String(formato).toUpperCase()]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { console.error('Error al guardar el documento laboral', error); res.status(500).json({ success: false, message: 'Error al procesar el archivo. Intente exportar nuevamente' }); }
};

export const calculateBenefits = async (req: Request, res: Response): Promise<void> => {
  const { 
    fechaIngreso, 
    fechaRetiro, 
    motivo, 
    salarioMes1, 
    salarioMes2, 
    salarioMes3, 
    diasVacacionesPendientes = 0,
    userId: _userId
  } = req.body;

  const salarios = [salarioMes1, salarioMes2, salarioMes3].map(Number);
  const calculationInput = {
    fechaIngreso: String(fechaIngreso ?? ''),
    fechaRetiro: String(fechaRetiro ?? ''),
    motivo,
    salarioMes1: salarios[0],
    salarioMes2: salarios[1],
    salarioMes3: salarios[2],
    diasVacacionesPendientes: Number(diasVacacionesPendientes),
  } as const;

  const validation = validateBenefitsInput(calculationInput);
  if (!validation.valid) {
    res.status(400).json({ success: false, message: INVALID_BENEFITS_INPUT_MESSAGE });
    return;
  }

  try {
    // Ejecutar cálculo con el motor especializado
    const resultado = calcularBeneficios(calculationInput);

    // Generar informe formateado
    const informe = generarInforme(resultado);

    // Guardar en base de datos
    const saved = await pool.query(
      'INSERT INTO calculo_laboral (id_usuario, tipo_calculo, salario, fecha_ingreso, fecha_salida, resultado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_calculo',
      [
        getAuthenticatedUserId(req),
        motivo,
        resultado.spi,
        toDatabaseDate(fechaIngreso),
        toDatabaseDate(fechaRetiro),
        resultado.totalFiniquito,
      ]
    );

    const calculationId = saved.rows[0].id_calculo;

    // Guardar detalles de cálculo
    const conceptos = [
      { concepto: 'Indemnización por Tiempo de Servicios', monto: resultado.indemnizacion.subtotal },
      { concepto: 'Desahucio', monto: resultado.desahucio.subtotal },
      { concepto: 'Aguinaldo Proporcional', monto: resultado.aguinaldo.subtotal },
      { concepto: 'Vacaciones No Gozadas', monto: resultado.vacaciones.subtotal },
    ];

    for (const { concepto, monto } of conceptos) {
      if (monto > 0) {
        await pool.query(
          'INSERT INTO detalle_calculo (id_calculo, concepto, monto) VALUES ($1, $2, $3)',
          [calculationId, concepto, monto]
        );
      }
    }

    res.json({
      success: true,
      data: {
        calculationId,
        resultado,
        informe,
      },
    });
  } catch (error) {
    console.error('Error en cálculo de beneficios:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la estimación de beneficios' });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = getAuthenticatedUserId(req);
  try {
    const [documents, calculations, chats] = await Promise.all([
      pool.query('SELECT id_documento AS id, titulo AS title, contenido AS content, fecha_creacion AS created_at FROM documento_laboral WHERE id_usuario = $1 ORDER BY fecha_creacion DESC', [userId]),
      pool.query('SELECT id_calculo AS id, tipo_calculo AS title, resultado AS content, fecha_calculo AS created_at FROM calculo_laboral WHERE id_usuario = $1 ORDER BY fecha_calculo DESC', [userId]),
      pool.query('SELECT id_chat AS id, titulo AS title, fecha_creacion AS created_at FROM chat WHERE id_usuario = $1 ORDER BY fecha_creacion DESC', [userId]),
    ]);
    res.json({ success: true, data: { documents: documents.rows, calculations: calculations.rows, chats: chats.rows } });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'No se pudo cargar el historial.' }); }
};
