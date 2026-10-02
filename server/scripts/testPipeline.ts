import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { vectorizeLegalDocument } from '../services/embeddingService';
import { chunkLegalDocument } from '../services/textChunkerService';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const pdfDirectory = process.env.PDF_DIRECTORY || path.join(projectRoot, 'src', 'PDF');
const configuredPdf = process.env.TEST_PDF_PATH;
const apiUrl = process.env.API_URL || 'http://localhost:3001';
const databaseUrl =
  process.env.DATABASE_VECTORIAL_URL ||
  'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial';

interface TestResult {
  requirement: string;
  status: 'SUCCESS' | 'FAILED';
  details: string;
}

interface UploadResponse {
  success: boolean;
  message?: string;
  data?: {
    normativaId: string;
    documentoId: string;
    archivo: string;
  };
}

const results: TestResult[] = [];

const record = (requirement: string, status: TestResult['status'], details: string): void => {
  results.push({ requirement, status, details });
  console.log(`[${status}] ${requirement}: ${details}`);
};

const selectPdf = async (): Promise<string> => {
  if (configuredPdf) return path.resolve(configuredPdf);

  const files = (await fs.readdir(pdfDirectory))
    .filter((file) => file.toLowerCase().endsWith('.pdf'))
    .sort();
  const preferred = files.find((file) => /ley_general_del_trabajo|02_ley_general/i.test(file));
  const selected = preferred || files[0];

  if (!selected) throw new Error(`No se encontró ningún PDF en ${pdfDirectory}`);
  return path.join(pdfDirectory, selected);
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Respuesta no JSON de ${response.url}: ${body.slice(0, 200)}`);
  }
};

const uploadPdf = async (pdfPath: string): Promise<UploadResponse> => {
  const fileBuffer = await fs.readFile(pdfPath);
  const form = new FormData();
  form.append(
    'file',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    path.basename(pdfPath)
  );
  form.append('titulo', `Prueba de integración: ${path.basename(pdfPath, '.pdf')}`);
  form.append('tipo', 'Ley');
  form.append('numero', 'INTEGRATION-TEST');
  form.append('fuente', 'Prueba automatizada local');
  form.append('fechaPublicacion', '2024-01-01');

  const response = await fetch(`${apiUrl}/api/normativa`, {
    method: 'POST',
    body: form,
  });
  const data = await parseJson<UploadResponse>(response);

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message || `La API respondió HTTP ${response.status}`);
  }

  return data;
};

const getVectorDimension = async (pool: Pool): Promise<number> => {
  const result = await pool.query<{ dimension: number }>(
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

const verifyDatabase = async (
  pool: Pool,
  documentId: string,
  normativeId: string,
  expectedMinimum: number
): Promise<{ articles: number; fragments: number; embeddings: number; dimension: number }> => {
  const result = await pool.query<{
    articles: string;
    fragments: string;
    embeddings: string;
  }>(
    `SELECT
       (SELECT count(*) FROM articulo WHERE id_documento = $1) AS articles,
       (SELECT count(*)
          FROM fragmento_legal f
          JOIN articulo a ON a.id_articulo = f.id_articulo
         WHERE a.id_documento = $1) AS fragments,
       (SELECT count(*)
          FROM embedding e
          JOIN fragmento_legal f ON f.id_fragmento = e.id_fragmento
          JOIN articulo a ON a.id_articulo = f.id_articulo
         WHERE a.id_documento = $1) AS embeddings`,
    [documentId]
  );

  const counts = result.rows[0];
  const articles = Number(counts.articles);
  const fragments = Number(counts.fragments);
  const embeddings = Number(counts.embeddings);
  const normative = await pool.query<{ estado: string }>(
    'SELECT estado FROM normativa WHERE id_normativa = $1',
    [normativeId]
  );

  if (articles < 1 || fragments < expectedMinimum) {
    throw new Error(`Conteos RF05 insuficientes: artículos=${articles}, fragmentos=${fragments}`);
  }

  return { articles, fragments, embeddings, dimension: await getVectorDimension(pool) };
};

const main = async (): Promise<void> => {
  let pool: Pool | undefined;
  let documentId = '';
  let normativeId = '';

  try {
    const pdfPath = await selectPdf();
    const stats = await fs.stat(pdfPath);
    console.log(`\nPDF de prueba: ${pdfPath} (${Math.round(stats.size / 1024)} KB)`);

    if (stats.size > 20 * 1024 * 1024) throw new Error('El PDF de prueba supera 20 MB.');
    if (path.extname(pdfPath).toLowerCase() !== '.pdf') throw new Error('El archivo no es PDF.');

    const upload = await uploadPdf(pdfPath);
    documentId = upload.data!.documentoId;
    normativeId = upload.data!.normativaId;

    pool = new Pool({ connectionString: databaseUrl });
    const rf04 = await pool.query<{ documents: string; normatives: string }>(
      `SELECT
         (SELECT count(*) FROM documento_legal WHERE id_documento = $1) AS documents,
         (SELECT count(*) FROM normativa WHERE id_normativa = $2) AS normatives`,
      [documentId, normativeId]
    );

    if (Number(rf04.rows[0].documents) !== 1 || Number(rf04.rows[0].normatives) !== 1) {
      throw new Error('La API respondió correctamente, pero no creó los registros RF04.');
    }
    record('RF04 - subida y registro', 'SUCCESS', `documento=${documentId}`);

    const chunking = await chunkLegalDocument(documentId);
    const counts = await verifyDatabase(pool, documentId, normativeId, chunking.fragments);
    record(
      'RF05 - extracción y chunking',
      'SUCCESS',
      `artículos=${counts.articles}, fragmentos=${counts.fragments}, máximo=512 tokens, overlap=50`
    );

    const embedding = await vectorizeLegalDocument(documentId);
    const finalCounts = await verifyDatabase(pool, documentId, normativeId, counts.fragments);
    if (embedding.fragments !== finalCounts.embeddings) {
      throw new Error(`Embeddings esperados=${embedding.fragments}, encontrados=${finalCounts.embeddings}`);
    }
    if (finalCounts.embeddings !== finalCounts.fragments) {
      throw new Error(`No todos los fragmentos tienen embedding: ${finalCounts.embeddings}/${finalCounts.fragments}`);
    }
    record(
      'RF06 - embeddings y pgvector',
      'SUCCESS',
      `embeddings=${finalCounts.embeddings}, dimensión=${finalCounts.dimension}, estado=${embedding.estado}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedRequirement = results.length === 0 ? 'RF04' : results.length === 1 ? 'RF05/RF06' : 'RF06';
    if (failedRequirement === 'RF04') {
      record('RF04 - subida y registro', 'FAILED', message);
      record('RF05 - extracción y chunking', 'FAILED', 'No ejecutado: RF04 no creó el documento.');
      record('RF06 - embeddings y pgvector', 'FAILED', 'No ejecutado: RF05 no creó los fragmentos.');
    } else if (failedRequirement === 'RF05/RF06') {
      record('RF05 - extracción y chunking', 'FAILED', message);
      record('RF06 - embeddings y pgvector', 'FAILED', 'No ejecutado: RF05 no terminó correctamente.');
    } else {
      record('RF06 - embeddings y pgvector', 'FAILED', message);
    }
  } finally {
    await pool?.end();
  }

  console.log('\nResumen del pipeline:');
  for (const result of results) {
    console.log(`- ${result.requirement}: ${result.status} - ${result.details}`);
  }

  if (results.some((result) => result.status === 'FAILED')) process.exitCode = 1;
};

void main();
