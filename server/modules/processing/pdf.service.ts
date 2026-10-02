import fs from 'fs';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { queryDb, queryDbSingle, execDb } from '../../database/index.js';
import { createOpenAIEmbeddings, OPENAI_EMBEDDING_MODEL } from '../../services/openAIEmbeddings.js';

interface ProcessingResult {
  success: boolean;
  fragmentsCreated: number;
  embeddingsGenerated: number;
  message: string;
  errors?: string[];
}

interface FragmentMetadata {
  norma_id: string;
  version_id: string;
  tipo_norma: string;
  numero_norma: string;
  titulo: string;
  articulo?: string;
  capitulo?: string;
  seccion?: string;
  pagina: number;
  chunk_index: number;
}

export class PdfProcessingService {
  /**
   * Extraer texto de un archivo PDF
   */
  static async extractTextFromPdf(filePath: string): Promise<{
    text: string;
    totalPages: number;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo PDF no encontrado: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(fileBuffer);

      let text = '';
      for (let i = 0; i < pdfData.numpages; i++) {
        const page = pdfData.numpages > 0 ? pdfData.text : '';
        text += page;
      }

      return {
        text: text || pdfData.text,
        totalPages: pdfData.numpages,
      };
    } catch (error) {
      throw new Error(
        `Error al extraer texto del PDF: ${error instanceof Error ? error.message : 'desconocido'}`
      );
    }
  }

  /**
   * Dividir texto en chunks preservando contexto jurídico
   * Intenta preservar artículos completos cuando es posible
   */
  static chunkLegalText(
    text: string,
    maxChunkSize: number = 1000,
    overlapSize: number = 200
  ): Array<{ text: string; page: number; chunkIndex: number }> {
    const chunks: Array<{ text: string; page: number; chunkIndex: number }> = [];
    let chunkIndex = 0;

    // Limpiar y normalizar texto
    let cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n\n+/g, '\n')
      .trim();

    // Intentar dividir por artículos primero
    const articlePattern =
      /(?:ARTÍCULO|Art\.?|CAPÍTULO|Cap\.?|SECCIÓN|Sec\.?)\s+\d+[^\n]*/gi;
    const articleMatches = Array.from(cleanedText.matchAll(articlePattern));

    if (articleMatches.length > 0) {
      // Procesar por artículos
      for (let i = 0; i < articleMatches.length; i++) {
        const startIdx = articleMatches[i].index || 0;
        const endIdx = i < articleMatches.length - 1 ? (articleMatches[i + 1].index || 0) : cleanedText.length;

        let articleText = cleanedText.substring(startIdx, endIdx).trim();

        // Si el artículo es muy largo, dividirlo en chunks más pequeños
        while (articleText.length > maxChunkSize) {
          const chunk = articleText.substring(0, maxChunkSize);
          chunks.push({
            text: chunk,
            page: Math.floor(startIdx / 3000),
            chunkIndex: chunkIndex++,
          });
          articleText = articleText.substring(maxChunkSize - overlapSize);
        }

        if (articleText.length > 0) {
          chunks.push({
            text: articleText,
            page: Math.floor(startIdx / 3000),
            chunkIndex: chunkIndex++,
          });
        }
      }
    } else {
      // Dividir por párrafos si no hay estructura de artículos
      const paragraphs = cleanedText.split(/\n\n+/);
      let currentChunk = '';

      for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > maxChunkSize) {
          if (currentChunk) {
            chunks.push({
              text: currentChunk.trim(),
              page: 0,
              chunkIndex: chunkIndex++,
            });
          }
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }

      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          page: 0,
          chunkIndex: chunkIndex++,
        });
      }
    }

    return chunks;
  }

  /**
   * Generar embedding para un fragmento de texto
   * Utiliza la API de embeddings configurada
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      return (await createOpenAIEmbeddings([text]))[0];
    } catch (error) {
      throw new Error(
        `Error al generar embedding: ${error instanceof Error ? error.message : 'desconocido'}`
      );
    }
  }

  /**
   * Procesar un documento normativo completo
   * Extrae texto -> chunking -> genera embeddings -> almacena en BD
   */
  static async processNormativeDocument(
    normativaId: string,
    filePath: string,
    metadata: {
      tipo_norma: string;
      numero_norma: string;
      titulo: string;
    }
  ): Promise<ProcessingResult> {
    const errors: string[] = [];
    let fragmentsCreated = 0;
    let embeddingsGenerated = 0;

    try {
      // Actualizar estado a PROCESANDO
      await execDb(
        "UPDATE normativa SET estado = 'PROCESANDO' WHERE id_normativa = $1",
        [normativaId],
        true
      );

      // 1. Extraer texto del PDF
      const { text, totalPages } = await this.extractTextFromPdf(filePath);

      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto del PDF');
      }

      // 2. Dividir en chunks
      const chunks = this.chunkLegalText(text);

      if (chunks.length === 0) {
        throw new Error('No se generaron fragmentos del documento');
      }

      // 3. Crear fragmentos en BD y generar embeddings
      for (const chunk of chunks) {
        try {
          const fragmentId = uuidv4();

          // Crear fragmento legal
          await execDb(
            `INSERT INTO fragmento_legal (id_fragmento, id_articulo, numero_fragmento, texto_fragmento, pagina, estado)
             VALUES ($1, NULL, $2, $3, $4, 'COMPLETADO')`,
            [fragmentId, chunk.chunkIndex, chunk.text, chunk.page],
            true
          );

          fragmentsCreated++;

          // Generar embedding
          const embedding = await this.generateEmbedding(chunk.text);

          // Almacenar embedding en pgVector
          await execDb(
            `INSERT INTO embedding (id_embedding, id_fragmento, embedding, modelo_embedding, fecha_generacion)
             VALUES ($1, $2, $3::vector, $4, CURRENT_TIMESTAMP)`,
            [uuidv4(), fragmentId, `[${embedding.join(',')}]`, OPENAI_EMBEDDING_MODEL],
            true
          );

          embeddingsGenerated++;
        } catch (chunkError) {
          const errorMsg =
            chunkError instanceof Error
              ? chunkError.message
              : `Error en chunk ${chunk.chunkIndex}`;
          errors.push(errorMsg);
          console.error(`Error procesando chunk ${chunk.chunkIndex}:`, errorMsg);
        }
      }

      // 4. Actualizar estado a ACTIVO
      await execDb(
        "UPDATE normativa SET estado = 'ACTIVO' WHERE id_normativa = $1",
        [normativaId],
        true
      );

      return {
        success: true,
        fragmentsCreated,
        embeddingsGenerated,
        message: `Documento procesado: ${fragmentsCreated} fragmentos, ${embeddingsGenerated} embeddings generados`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

      // Actualizar estado a ERROR
      await execDb(
        "UPDATE normativa SET estado = 'ERROR' WHERE id_normativa = $1",
        [normativaId],
        true
      );

      return {
        success: false,
        fragmentsCreated,
        embeddingsGenerated,
        message: `Fallo en la extracción o fragmentación del texto normativo: ${errorMsg}`,
        errors: [errorMsg, ...errors],
      };
    }
  }

  /**
   * Reintentarprocessamiento de un documento con error
   */
  static async retryProcessing(
    normativaId: string,
    filePath: string,
    metadata: {
      tipo_norma: string;
      numero_norma: string;
      titulo: string;
    }
  ): Promise<ProcessingResult> {
    // Limpiar fragmentos anteriores
    await execDb(
      `DELETE FROM fragmento_legal 
       WHERE id_articulo IN (
         SELECT id_articulo FROM articulo 
         WHERE id_documento IN (
           SELECT id_documento FROM documento_legal 
           WHERE id_normativa = $1
         )
       )`,
      [normativaId],
      true
    );

    return this.processNormativeDocument(normativaId, filePath, metadata);
  }
}
