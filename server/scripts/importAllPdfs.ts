import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { ingestNormativaPdf } from '../services/pdfIngestionService';
import { chunkLegalDocument } from '../services/textChunkerService';
import { vectorizeLegalDocument } from '../services/embeddingService';

const pdfDirectory = process.env.PDF_DIRECTORY || path.resolve('src/PDF');
const pool = new Pool({ connectionString: process.env.DATABASE_VECTORIAL_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial' });

const metadata = (fileName: string) => {
  const base = path.basename(fileName, '.pdf').replace(/^\d+_/, '').replace(/_/g, ' ');
  const number = base.match(/(?:DS|Decreto Ley|Ley) ?[\d.]+/i)?.[0] || 'Normativa laboral boliviana';
  const type = /constitucion/i.test(base) ? 'Código' : /ley/i.test(base) ? 'Ley' : 'Decreto Supremo';
  return { titulo: base.slice(0, 250), tipo: type, numero: number.slice(0, 100), fuente: 'Archivo PDF local de Consulta Laboral Bolivia', fechaPublicacion: '2024-01-01' };
};

const main = async (): Promise<void> => {
  const files = (await fs.readdir(pdfDirectory)).filter((file) => file.toLowerCase().endsWith('.pdf')).sort();
  let imported = 0; let skipped = 0;
  for (const file of files) {
    const existing = await pool.query<{ id_documento: string }>('SELECT id_documento FROM documento_legal WHERE nombre = $1 LIMIT 1', [file]);
    if (existing.rowCount) {
      const documentId = existing.rows[0].id_documento;
      const coverage = await pool.query<{ fragments: string; embeddings: string }>(
        `SELECT count(DISTINCT f.id_fragmento) AS fragments, count(DISTINCT e.id_embedding) AS embeddings
         FROM articulo a
         JOIN fragmento_legal f ON f.id_articulo = a.id_articulo
         LEFT JOIN embedding e ON e.id_fragmento = f.id_fragmento
         WHERE a.id_documento = $1`,
        [documentId]
      );
      const { fragments, embeddings } = coverage.rows[0];
      if (Number(fragments) > Number(embeddings)) {
        const result = await vectorizeLegalDocument(documentId);
        console.log(`[VECTORIZED] ${file}: ${result.fragments} embeddings faltantes completados`);
      } else {
        console.log(`[SKIPPED] ${file}: ya está vectorizado`);
      }
      skipped += 1;
      continue;
    }
    try {
      const filePath = path.join(pdfDirectory, file);
      const result = await ingestNormativaPdf({ ...metadata(file), filePath, fileName: file, sizeMb: (await fs.stat(filePath)).size / 1024 / 1024 });
      const chunking = await chunkLegalDocument(result.documentoId);
      const embeddings = await vectorizeLegalDocument(result.documentoId);
      console.log(`[IMPORTED] ${file}: ${chunking.articles} artículos, ${chunking.fragments} fragmentos, ${embeddings.fragments} embeddings`);
      imported += 1;
    } catch (error) {
      console.error(`[FAILED] ${file}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`\nImportación completada: ${imported} nuevos, ${skipped} omitidos.`);
  await pool.end();
};
void main().catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
