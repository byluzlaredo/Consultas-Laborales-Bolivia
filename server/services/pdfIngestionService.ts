import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_VECTORIAL_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
});

export interface IngestNormativaInput {
  titulo: string;
  tipo: string;
  numero: string;
  fuente: string;
  fechaPublicacion: string;
  filePath: string;
  fileName: string;
  sizeMb: number;
}

const splitIntoArticles = (text: string): Array<{ numero: number; titulo: string; texto: string }> => {
  const normalized = text.replace(/\r/g, ' ');
  const articlePattern = /(ART[ÍI]CULO|ARTICULO)\s*\d{1,3}°?\s*[:.-]?\s*([^\n]+)/gi;
  const matches = [...normalized.matchAll(articlePattern)];

  if (matches.length === 0) {
    return [{ numero: 1, titulo: 'Artículo 1', texto: normalized.slice(0, 2000) }];
  }

  const entries: Array<{ numero: number; titulo: string; texto: string }> = [];

  matches.forEach((match, index) => {
    const rawNumber = match[0].match(/\d{1,3}/)?.[0] ?? String(index + 1);
    const title = match[0].trim();
    const start = match.index ?? 0;
    const nextStart = matches[index + 1]?.index ?? normalized.length;
    const articleText = normalized.slice(start + match[0].length, nextStart).trim();

    entries.push({
      numero: Number(rawNumber),
      titulo: title,
      texto: articleText,
    });
  });

  return entries;
};

export const ingestNormativaPdf = async (input: IngestNormativaInput) => {
  const { titulo, tipo, numero, fuente, fechaPublicacion, filePath, fileName, sizeMb } = input;

  if (!fs.existsSync(filePath)) {
    throw new Error('El archivo PDF no existe en la ruta indicada.');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(fileBuffer);
  const fullText = pdfData.text || '';
  const articleChunks = splitIntoArticles(fullText);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const normativaQuery = `
      INSERT INTO normativa (titulo, tipo, numero, fuente, fecha_publicacion, estado)
      VALUES ($1, $2, $3, $4, $5, 'Pendiente de Procesamiento')
      RETURNING id_normativa
    `;

    const normativaResult = await client.query(normativaQuery, [titulo, tipo, numero, fuente, fechaPublicacion]);
    const idNormativa = normativaResult.rows[0].id_normativa;

    const documentoQuery = `
      INSERT INTO documento_legal (id_normativa, nombre, url_fuente, contenido_completo, total_paginas, version)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_documento
    `;

    const nombreArchivo = path.basename(fileName);
    const documentoResult = await client.query(documentoQuery, [
      idNormativa,
      nombreArchivo,
      filePath,
      fullText,
      pdfData.numpages || 1,
      '1.0',
    ]);

    const idDocumento = documentoResult.rows[0].id_documento;

    for (const [index, article] of articleChunks.entries()) {
      const articuloResult = await client.query(
        `INSERT INTO articulo (id_documento, numero_articulo, titulo) VALUES ($1, $2, $3) RETURNING id_articulo`,
        [idDocumento, article.numero || index + 1, article.titulo || `Artículo ${index + 1}`]
      );

      const idArticulo = articuloResult.rows[0].id_articulo;

      const fragmentText = article.texto || fullText;
      const fragments = fragmentText
        .split(/(?=(?:ART[ÍI]CULO|ARTICULO)\s*\d{1,3})/gi)
        .filter((part) => part.trim().length > 0)
        .slice(0, 3);

      for (let i = 0; i < fragments.length; i += 1) {
        const fragment = fragments[i];
        await client.query(
          `INSERT INTO fragmento_legal (id_articulo, numero_fragmento, texto_fragmento, pagina)
           VALUES ($1, $2, $3, $4)`,
          [idArticulo, i + 1, fragment.trim(), i + 1]
        );
      }

      if (fragments.length === 0) {
        await client.query(
          `INSERT INTO fragmento_legal (id_articulo, numero_fragmento, texto_fragmento, pagina)
           VALUES ($1, $2, $3, $4)`,
          [idArticulo, 1, fragmentText.slice(0, 2000).trim(), 1]
        );
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      normativaId: idNormativa,
      documentoId: idDocumento,
      archivo: fileName,
      sizeMb,
      estado: 'Pendiente de Procesamiento',
      articulos: articleChunks.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Error al procesar el PDF';
    throw new Error(message);
  } finally {
    client.release();
  }
};
