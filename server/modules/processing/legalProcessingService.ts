import { Pool } from 'pg';
import { chunkLegalDocument } from '../../services/textChunkerService.js';
import { vectorizeLegalDocument } from '../../services/embeddingService.js';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_VECTORIAL_URL ||
    'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

export interface PendingDocument {
  id_documento: string;
  id_normativa: string;
  titulo: string;
  tipo: string;
  numero: string;
  fuente: string;
  fecha_publicacion: string | null;
  url_fuente: string | null;
  nombre: string;
}

export const formatProcessingError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/Fallo en la extracción o fragmentación del texto normativo/i.test(message)) {
    return 'Fallo en la extracción o fragmentación del texto normativo';
  }

  if (/Error de conexión con la API de IA al generar embeddings/i.test(message)) {
    return 'Error de conexión con la API de IA al generar embeddings';
  }

  if (/Fallo al indexar en la base de datos vectorial/i.test(message)) {
    return 'Fallo al indexar en la base de datos vectorial';
  }

  return 'Fallo en la extracción o fragmentación del texto normativo';
};

export const formatEmbeddingError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/embedding|openai|fetch|ECONN|connection|api de ia/i.test(message)) {
    return 'Error de conexión con la API de IA al generar embeddings';
  }

  if (/vectorial|database|indexar|insert into embedding|pgvector/i.test(message)) {
    return 'Fallo al indexar en la base de datos vectorial';
  }

  return 'Error de conexión con la API de IA al generar embeddings';
};

export const detectPendingLegalDocuments = async (): Promise<PendingDocument[]> => {
  const result = await pool.query<PendingDocument>(
    `SELECT d.id_documento, d.id_normativa, n.titulo, n.tipo, n.numero, n.fuente, n.fecha_publicacion, d.url_fuente, d.nombre
     FROM documento_legal d
     JOIN normativa n ON n.id_normativa = d.id_normativa
     WHERE n.estado IN ('PENDIENTE_PROCESAMIENTO', 'Pendiente de Procesamiento', 'PROCESANDO', 'ERROR')
     ORDER BY d.fecha_creacion DESC`
  );

  return result.rows;
};

export const processPendingLegalDocuments = async (): Promise<{ processed: string[]; errors: Array<{ documentId: string; normaId: string; error: string }> }> => {
  const pending = await detectPendingLegalDocuments();
  const processed: string[] = [];
  const errors: Array<{ documentId: string; normaId: string; error: string }> = [];

  for (const document of pending) {
    try {
      await chunkLegalDocument(document.id_documento);
      await vectorizeLegalDocument(document.id_documento);
      processed.push(document.id_documento);
    } catch (error) {
      const message = formatProcessingError(error);
      errors.push({
        documentId: document.id_documento,
        normaId: document.id_normativa,
        error: message,
      });

      await pool
        .query(`UPDATE normativa SET estado = 'ERROR' WHERE id_normativa = $1`, [document.id_normativa])
        .catch(() => undefined);
    }
  }

  return { processed, errors };
};