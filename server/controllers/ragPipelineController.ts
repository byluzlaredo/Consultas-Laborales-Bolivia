import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { vectorizeLegalDocument } from '../services/embeddingService';
import { chunkLegalDocument } from '../services/textChunkerService';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_VECTORIAL_URL ||
    'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

const findDocumentIdByNormativa = async (normativaId: string): Promise<string> => {
  const result = await pool.query<{ id_documento: string }>(
    `SELECT id_documento
     FROM documento_legal
     WHERE id_normativa = $1
     ORDER BY id_documento
     LIMIT 1`,
    [normativaId]
  );

  if (result.rowCount === 0) {
    throw new Error('La normativa no tiene un documento legal asociado.');
  }

  return result.rows[0].id_documento;
};

const getRouteParameter = (value: string | string[] | undefined, name: string): string => {
  if (!value || Array.isArray(value)) {
    throw new Error(`El parámetro ${name} es obligatorio.`);
  }
  return value;
};

export const processLegalDocument = async (documentId: string) => {
  try {
    const chunking = await chunkLegalDocument(documentId);
    const embeddings = await vectorizeLegalDocument(documentId);
    return { chunking, embeddings };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar el documento legal.';

    if (/Fallo en la extracción o fragmentación del texto normativo/i.test(message)) {
      throw new Error('Fallo en la extracción o fragmentación del texto normativo');
    }

    if (/Error de conexión con la API de IA al generar embeddings/i.test(message)) {
      throw new Error('Error de conexión con la API de IA al generar embeddings');
    }

    if (/Fallo al indexar en la base de datos vectorial/i.test(message)) {
      throw new Error('Fallo al indexar en la base de datos vectorial');
    }

    throw new Error(message);
  }
};

export const processDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const documentId = getRouteParameter(req.params.documentId, 'documentId');
    const result = await processLegalDocument(documentId);
    res.status(200).json({ success: true, message: 'Documento procesado correctamente.', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar el documento legal.';
    res.status(500).json({ success: false, message });
  }
};

export const processNormativa = async (req: Request, res: Response): Promise<void> => {
  try {
    const normativaId = getRouteParameter(req.params.normativaId, 'normativaId');
    const documentId = await findDocumentIdByNormativa(normativaId);
    const result = await processLegalDocument(documentId);
    res.status(200).json({ success: true, message: 'Normativa procesada correctamente.', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al procesar la normativa legal.';
    res.status(500).json({ success: false, message });
  }
};
