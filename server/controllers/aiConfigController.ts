import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { LEGAL_SYSTEM_PROMPT } from '../config/legalSystemPrompt';

const pool = new Pool({
  connectionString: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema',
});

const defaults = {
  temperatura: 0.2,
  maxTokens: 1024,
  kChunks: 5,
  systemPrompt: LEGAL_SYSTEM_PROMPT,
};

export const validateModelParameters = (temperature: number | string, maxTokens: number | string): boolean => {
  const numericTemperature = Number(temperature);
  const numericMaxTokens = Number(maxTokens);

  if (!Number.isFinite(numericTemperature) || !Number.isFinite(numericMaxTokens)) {
    return false;
  }

  return numericTemperature >= 0 && numericTemperature <= 1 && numericMaxTokens >= 256 && numericMaxTokens <= 2048;
};

export const validateSystemPrompt = (value: string | null | undefined): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

const toConfig = (row: Record<string, unknown> | undefined) => ({
  temperatura: Number(row?.temperatura ?? defaults.temperatura),
  maxTokens: Number(row?.max_tokens ?? defaults.maxTokens),
  kChunks: Number(row?.k_chunks ?? defaults.kChunks),
  systemPrompt: typeof row?.system_prompt === 'string' && row.system_prompt.trim()
    ? row.system_prompt
    : defaults.systemPrompt,
});

export const getAIConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM configuracion_sistema WHERE id_configuracion = 1');
    res.json({ success: true, data: toConfig(result.rows[0]) });
  } catch {
    res.status(500).json({ success: false, message: 'No se pudo cargar la configuración del modelo.' });
  }
};

export const saveAIConfig = async (req: Request, res: Response): Promise<void> => {
  const { temperatura, maxTokens, kChunks, systemPrompt } = req.body;
  const isModelUpdate = Object.prototype.hasOwnProperty.call(req.body, 'temperatura') || Object.prototype.hasOwnProperty.call(req.body, 'maxTokens');
  const isSystemPromptUpdate = Object.prototype.hasOwnProperty.call(req.body, 'systemPrompt');

  try {
    const currentResult = await pool.query('SELECT * FROM configuracion_sistema WHERE id_configuracion = 1');
    const current = toConfig(currentResult.rows[0]);

    if (isModelUpdate && !validateModelParameters(temperatura ?? current.temperatura, maxTokens ?? current.maxTokens)) {
      res.status(400).json({ success: false, message: 'Los valores ingresados están fuera del rango permitido' });
      return;
    }

    if (isSystemPromptUpdate && !validateSystemPrompt(systemPrompt)) {
      res.status(400).json({ success: false, message: 'El texto de instrucciones no puede estar vacío' });
      return;
    }

    const nextValues = {
      temperatura: Number(temperatura ?? current.temperatura),
      max_tokens: Number(maxTokens ?? current.maxTokens),
      k_chunks: Number(kChunks ?? current.kChunks),
      system_prompt: String(systemPrompt ?? current.systemPrompt).trim(),
    };

    const result = await pool.query(
      `INSERT INTO configuracion_sistema (id_configuracion, temperatura, max_tokens, k_chunks, system_prompt, fecha_actualizacion)
       VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id_configuracion) DO UPDATE SET
         temperatura = EXCLUDED.temperatura,
         max_tokens = EXCLUDED.max_tokens,
         k_chunks = EXCLUDED.k_chunks,
         system_prompt = EXCLUDED.system_prompt,
         fecha_actualizacion = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        nextValues.temperatura,
        nextValues.max_tokens,
        nextValues.k_chunks,
        nextValues.system_prompt,
      ]
    );

    const message = isModelUpdate
      ? 'Parámetros del modelo actualizados correctamente'
      : 'Instrucciones del asistente guardadas con éxito';

    res.json({ success: true, message, data: toConfig(result.rows[0]) });
  } catch (error) {
    console.error('saveAIConfig error', error);
    res.status(500).json({ success: false, message: 'No se pudo guardar la configuración del modelo.' });
  }
};
