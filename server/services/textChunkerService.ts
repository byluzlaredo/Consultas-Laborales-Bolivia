import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { Pool, type PoolClient } from 'pg';

const MAX_TOKENS = 512;
const OVERLAP_TOKENS = 50;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_VECTORIAL_URL ||
    'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

export interface LegalArticle {
  number: number;
  title: string;
  text: string;
  hierarchy: string[];
}

export interface LegalChunk {
  number: number;
  text: string;
  page: number;
}

export interface ChunkingResult {
  documentId: string;
  normativeId: string;
  articles: number;
  fragments: number;
  estado: string;
}

const normalizeText = (text: string): string =>
  text
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getTokens = (text: string): string[] => text.split(/\s+/).filter(Boolean);

const findHierarchy = (line: string, hierarchy: string[]): string[] => {
  const titleMatch = line.match(/^T[ÍI]TULO\s+(.+)$/i);
  const chapterMatch = line.match(/^CAP[ÍI]TULO\s+(.+)$/i);

  if (titleMatch) {
    return [titleMatch[0].trim()];
  }

  if (chapterMatch) {
    return [...hierarchy.filter((item) => /^T[ÍI]TULO/i.test(item)), chapterMatch[0].trim()];
  }

  return hierarchy;
};

export const extractLegalArticles = (text: string): LegalArticle[] => {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const articlePattern = /^(ART[ÍI]CULO|ARTICULO)\s+(\d{1,4})(?:\s*[°º.-])?\s*[:.-]?\s*(.*)$/i;
  const articles: LegalArticle[] = [];
  let hierarchy: string[] = [];
  let current: LegalArticle | null = null;

  const appendLine = (line: string): void => {
    if (!current || !line.trim()) return;
    current.text = `${current.text} ${line.trim()}`.trim();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    hierarchy = findHierarchy(line, hierarchy);
    const articleMatch = line.match(articlePattern);

    if (!articleMatch) {
      appendLine(line);
      continue;
    }

    if (current) articles.push(current);

    const articleHeading = `${articleMatch[1]} ${articleMatch[2]}${articleMatch[3] ? `: ${articleMatch[3]}` : ''}`;
    current = {
      number: Number(articleMatch[2]),
      title: [...hierarchy, articleHeading].join(' / ').slice(0, 255),
      text: articleMatch[3].trim(),
      hierarchy: [...hierarchy],
    };
  }

  if (current) articles.push(current);

  return articles.length > 0
    ? articles
    : [{ number: 1, title: 'Artículo 1', text: normalized, hierarchy: [] }];
};

export const chunkArticle = (article: LegalArticle): LegalChunk[] => {
  const tokens = getTokens(article.text);
  if (tokens.length === 0) {
    return [{ number: 1, text: article.title, page: 1 }];
  }

  const chunks: LegalChunk[] = [];
  let start = 0;
  let chunkNumber = 1;

  while (start < tokens.length) {
    const end = Math.min(start + MAX_TOKENS, tokens.length);
    chunks.push({
      number: chunkNumber,
      text: tokens.slice(start, end).join(' '),
      page: Math.max(1, Math.floor(start / 450) + 1),
    });
    chunkNumber += 1;

    if (end === tokens.length) break;
    start = end - OVERLAP_TOKENS;
  }

  return chunks;
};

const getDocument = async (client: PoolClient, documentId: string) => {
  const result = await client.query<{
    id_documento: string;
    id_normativa: string;
    url_fuente: string | null;
  }>(
    `SELECT id_documento, id_normativa, url_fuente
     FROM documento_legal
     WHERE id_documento = $1`,
    [documentId]
  );

  if (result.rowCount === 0) {
    throw new Error('El documento legal no existe.');
  }

  return result.rows[0];
};

export const chunkLegalDocument = async (documentId: string): Promise<ChunkingResult> => {
  const client = await pool.connect();
  let normativeId = '';

  try {
    const document = await getDocument(client, documentId);
    normativeId = document.id_normativa;

    if (!document.url_fuente || (!document.url_fuente.startsWith('file:') && !document.url_fuente.includes(path.sep))) {
      throw new Error('Fallo en la extracción o fragmentación del texto normativo');
    }

    const filePath = document.url_fuente.startsWith('file:')
      ? new URL(document.url_fuente).pathname
      : document.url_fuente;
    const fileBuffer = await fs.readFile(filePath).catch(() => {
      throw new Error('Fallo en la extracción o fragmentación del texto normativo');
    });

    const pdfData = await pdfParse(fileBuffer);
    if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('Fallo en la extracción o fragmentación del texto normativo');
    }
    const articles = extractLegalArticles(pdfData.text || '');

    await client.query('BEGIN');
    await client.query(
      `DELETE FROM articulo WHERE id_documento = $1`,
      [documentId]
    );

    let fragments = 0;
    for (const article of articles) {
      const articleResult = await client.query<{ id_articulo: string }>(
        `INSERT INTO articulo (id_documento, numero_articulo, titulo)
         VALUES ($1, $2, $3)
         RETURNING id_articulo`,
        [documentId, article.number, article.title]
      );

      for (const chunk of chunkArticle(article)) {
        await client.query(
          `INSERT INTO fragmento_legal
             (id_articulo, numero_fragmento, texto_fragmento, pagina)
           VALUES ($1, $2, $3, $4)`,
          [articleResult.rows[0].id_articulo, chunk.number, chunk.text, chunk.page]
        );
        fragments += 1;
      }
    }

    await client.query(
      `UPDATE normativa SET estado = 'Pendiente de Vectorización' WHERE id_normativa = $1`,
      [normativeId]
    );
    await client.query('COMMIT');

    return {
      documentId,
      normativeId,
      articles: articles.length,
      fragments,
      estado: 'Pendiente de Vectorización',
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (normativeId) {
      await client
        .query(`UPDATE normativa SET estado = 'Error de Procesamiento' WHERE id_normativa = $1`, [normativeId])
        .catch(() => undefined);
    }
    console.error('Fallo en la extracción o fragmentación del texto normativo', error);
    throw new Error('Fallo en la extracción o fragmentación del texto normativo');
  } finally {
    client.release();
  }
};

export { MAX_TOKENS, OVERLAP_TOKENS };
