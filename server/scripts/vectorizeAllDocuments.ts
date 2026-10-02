import { Pool } from 'pg';
import { vectorizeLegalDocument } from '../services/embeddingService';

const pool = new Pool({ connectionString: process.env.DATABASE_VECTORIAL_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial' });

const main = async (): Promise<void> => {
  const documents = await pool.query<{ id_documento: string; nombre: string }>(
    `SELECT DISTINCT d.id_documento, d.nombre
     FROM documento_legal d
     JOIN articulo a ON a.id_documento = d.id_documento
     JOIN fragmento_legal f ON f.id_articulo = a.id_articulo
     ORDER BY d.nombre`
  );
  let completed = 0;
  let failed = 0;
  for (const document of documents.rows) {
    try {
      const result = await vectorizeLegalDocument(document.id_documento);
      console.log(`[VECTORIZED] ${document.nombre}: ${result.fragments} embeddings`);
      completed += 1;
    } catch (error) {
      console.error(`[FAILED] ${document.nombre}:`, error instanceof Error ? error.message : error);
      failed += 1;
    }
  }
  console.log(`\nVectorización completada: ${completed} documentos, ${failed} fallidos.`);
  await pool.end();
  if (failed > 0) process.exitCode = 1;
};

void main().catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
