import { Pool, type PoolClient } from 'pg';
import { createOpenAIEmbeddings, OPENAI_EMBEDDING_MODEL } from './openAIEmbeddings.js';

const EMBEDDING_MODEL = OPENAI_EMBEDDING_MODEL;
const MAX_RETRIES = 3;
const BATCH_SIZE = 16;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_VECTORIAL_URL ||
    'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

interface FragmentRow {
  id_fragmento: string;
  texto_fragmento: string;
  id_normativa: string;
}

export interface EmbeddingResult {
  documentId: string;
  normativeId: string;
  fragments: number;
  model: string;
  estado: string;
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestEmbeddings = async (texts: string[]): Promise<number[][]> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await createOpenAIEmbeddings(texts);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await wait(500 * attempt);
    }
  }

  throw new Error('Error de conexión con la API de IA al generar embeddings');
};

export const formatEmbeddingError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/embedding|openai|fetch|ECONN|connection|api de ia/i.test(message)) {
    return 'Error de conexión con la API de IA al generar embeddings';
  }

  if (/vectorial|database|indexar|INSERT INTO embedding|pgvector/i.test(message)) {
    return 'Fallo al indexar en la base de datos vectorial';
  }

  return 'Error de conexión con la API de IA al generar embeddings';
};

export const formatVectorStorageError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/vectorial|database|indexar|INSERT INTO embedding|pgvector/i.test(message)) {
    return 'Fallo al indexar en la base de datos vectorial';
  }
  return formatEmbeddingError(error);
};

const getVectorDimension = async (client: PoolClient): Promise<number> => {
  const result = await client.query<{ dimension: number }>(
    `SELECT substring(format_type(a.atttypid, a.atttypmod) FROM '\\(([0-9]+)\\)')::integer AS dimension
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relname = 'embedding'
       AND n.nspname = current_schema()
       AND a.attname = 'embedding'
       AND NOT a.attisdropped`
  );

  return result.rows[0]?.dimension || 1536;
};

const loadFragments = async (client: PoolClient, documentId: string): Promise<FragmentRow[]> => {
  const result = await client.query<FragmentRow>(
    `SELECT f.id_fragmento, f.texto_fragmento, n.id_normativa
     FROM fragmento_legal f
     JOIN articulo a ON a.id_articulo = f.id_articulo
     JOIN documento_legal d ON d.id_documento = a.id_documento
     JOIN normativa n ON n.id_normativa = d.id_normativa
     WHERE d.id_documento = $1
     ORDER BY a.numero_articulo, f.numero_fragmento`,
    [documentId]
  );

  if (result.rowCount === 0) {
    throw new Error('Fallo al indexar en la base de datos vectorial');
  }
  return result.rows;
};

export const vectorizeLegalDocument = async (documentId: string): Promise<EmbeddingResult> => {
  const client = await pool.connect();
  let normativeId = '';

  try {
    const fragments = await loadFragments(client, documentId);
    normativeId = fragments[0].id_normativa;
    const dimension = await getVectorDimension(client);
    const vectors: Array<{ id: string; values: number[] }> = [];

    for (let offset = 0; offset < fragments.length; offset += BATCH_SIZE) {
      const batch = fragments.slice(offset, offset + BATCH_SIZE);
      const batchEmbeddings = await requestEmbeddings(batch.map((fragment) => fragment.texto_fragmento));
      const batchVectors = batch.map((fragment, index) => {
        const values = batchEmbeddings[index];
        if (values.length !== dimension) {
          throw new Error('Fallo al indexar en la base de datos vectorial');
        }
        return { id: fragment.id_fragmento, values };
      });
      vectors.push(...batchVectors);
    }

    await client.query('BEGIN');
    await client.query(
      `DELETE FROM embedding
       WHERE id_fragmento IN (
         SELECT f.id_fragmento
         FROM fragmento_legal f
         JOIN articulo a ON a.id_articulo = f.id_articulo
         WHERE a.id_documento = $1
       )`,
      [documentId]
    );

    for (const vector of vectors) {
      await client.query(
        `INSERT INTO embedding (id_fragmento, embedding, modelo_embedding)
         VALUES ($1, $2::vector, $3)`,
        [vector.id, `[${vector.values.join(',')}]`, EMBEDDING_MODEL]
      );
    }

    await client.query(
      `UPDATE normativa SET estado = 'ACTIVO' WHERE id_normativa = $1`,
      [normativeId]
    );
    await client.query('COMMIT');

    return {
      documentId,
      normativeId,
      fragments: vectors.length,
      model: EMBEDDING_MODEL,
      estado: 'Procesado / Activo',
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (normativeId) {
      await client
        .query(`UPDATE normativa SET estado = 'Error de Vectorización' WHERE id_normativa = $1`, [normativeId])
        .catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : String(error ?? '');
    const formatted = /vectorial|database|indexar|INSERT INTO embedding|pgvector/i.test(message)
      ? 'Fallo al indexar en la base de datos vectorial'
      : 'Error de conexión con la API de IA al generar embeddings';
    console.error(formatted, error);
    throw new Error(formatted);
  } finally {
    client.release();
  }
};

export { BATCH_SIZE, EMBEDDING_MODEL, MAX_RETRIES };
