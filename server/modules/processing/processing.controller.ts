import type { Request, Response } from 'express';
import { NormativaService } from '../normativa/normativa.service.js';
import { queryDb } from '../../database/index.js';
import { processLegalDocument } from '../../controllers/ragPipelineController.js';

class ProcessingController {
  async procesarNormativa(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const normativaId = Array.isArray(id) ? id[0] : id;

    if (!normativaId) {
      res.status(400).json({ message: 'ID de normativa requerido' });
      return;
    }

    try {
      // Obtener datos de la normativa
      const normativa = await NormativaService.getNormativaById(normativaId);
      if (!normativa) {
        res.status(404).json({ message: 'Normativa no encontrada' });
        return;
      }

      // Obtener ruta del archivo de la versión actual
      const versionResult = await queryDb(
        'SELECT url_fuente FROM documento_legal WHERE id_normativa = $1 LIMIT 1',
        [normativaId],
        true
      );
      
      const version = Array.isArray(versionResult) ? versionResult[0] : versionResult;
      if (!version?.url_fuente) {
        res.status(404).json({ message: 'Archivo de normativa no encontrado' });
        return;
      }

      // Procesar de forma síncrona para confirmar chunks y embeddings antes de responder.
      await NormativaService.changeStatus(normativaId, { estado: 'PROCESANDO' });

      const document = await queryDb<{ id_documento: string }>(
        'SELECT id_documento FROM documento_legal WHERE id_normativa = $1 ORDER BY version DESC LIMIT 1',
        [normativaId],
        true
      );
      const pipeline = await processLegalDocument(document[0].id_documento);

      res.json({
        success: true,
        message: 'Documento normativo registrado e indexado con éxito',
        normativaId,
        pipeline,
      });
    } catch (error) {
      const failedNormativaId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (failedNormativaId) await NormativaService.changeStatus(failedNormativaId, { estado: 'ERROR' }).catch(() => undefined);
      console.error('Error initiating processing:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error al iniciar procesamiento',
      });
    }
  }

  async reintentar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const normativaId = Array.isArray(id) ? id[0] : id;

    if (!normativaId) {
      res.status(400).json({ message: 'ID de normativa requerido' });
      return;
    }

    try {
      // Actualizar estado a PENDIENTE_PROCESAMIENTO
      await NormativaService.changeStatus(normativaId, { estado: 'PENDIENTE_PROCESAMIENTO' });

      res.json({
        success: true,
        message: 'Procesamiento reintenado',
        normativaId,
      });
    } catch (error) {
      console.error('Error retrying processing:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error al reintentar procesamiento',
      });
    }
  }

  async obtenerEstado(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const normativaId = Array.isArray(id) ? id[0] : id;

    if (!normativaId) {
      res.status(400).json({ message: 'ID de normativa requerido' });
      return;
    }

    try {
      const normativa = await NormativaService.getNormativaById(normativaId);

      if (!normativa) {
        res.status(404).json({ message: 'Normativa no encontrada' });
        return;
      }

      // Contar fragmentos procesados
      const fragmentosResult = await queryDb<{ cantidad: number }>(
        'SELECT COUNT(*) as cantidad FROM fragmentos_normativa WHERE id_normativa = $1',
        [normativaId],
        true
      );

      const fragmentos = Array.isArray(fragmentosResult) ? fragmentosResult[0] : fragmentosResult;

      res.json({
        normativaId,
        estado: normativa.estado,
        titulo: normativa.titulo,
        fragmentosProcesados: fragmentos?.cantidad || 0,
        fechaCreacion: normativa.fecha_creacion,
      });
    } catch (error) {
      console.error('Error fetching processing status:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error al obtener estado',
      });
    }
  }

  async listarEnProceso(req: Request, res: Response): Promise<void> {
    try {
      const normativas = await queryDb(
        `SELECT id_normativa, titulo, estado, fecha_creacion, 
                (SELECT COUNT(*) FROM fragmentos_normativa WHERE id_normativa = n.id_normativa) as cantidad_fragmentos
         FROM normativa n
         WHERE estado IN ('PROCESANDO', 'PENDIENTE_PROCESAMIENTO')
         ORDER BY fecha_creacion DESC`,
        [],
        false
      );

      res.json({
        procesando: normativas,
      });
    } catch (error) {
      console.error('Error listing processing documents:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Error al listar documentos',
      });
    }
  }
}

export const processingController = new ProcessingController();
