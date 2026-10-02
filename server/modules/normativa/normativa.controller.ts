import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import multer from 'multer';
import { config } from '../../config/index.js';
import { NormativaService } from './normativa.service.js';
import type { UploadNormativaDto, UpdateNormativaDto, ChangeStatusDto } from './normativa.dto.js';
import { processLegalDocument } from '../../controllers/ragPipelineController.js';

// Configurar multer para carga de PDFs
const PDF_STORAGE_PATH = path.resolve(config.upload.directory);

if (!fs.existsSync(PDF_STORAGE_PATH)) {
  fs.mkdirSync(PDF_STORAGE_PATH, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PDF_STORAGE_PATH);
  },
  filename: (_req, file, cb) => {
    const sanitizedName = file.originalname
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizedName}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(new Error('Formato de archivo no válido. Solo se permiten archivos PDF'));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter,
});

/**
 * POST /api/normativa
 * Cargar nueva normativa con archivo PDF
 */
export const uploadNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo PDF válido',
      });
      return;
    }

    const filePath = path.join(PDF_STORAGE_PATH, req.file.filename);
    const fileValidation = NormativaService.validateFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!fileValidation.valid) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(fileValidation.message === 'El archivo excede el tamaño máximo permitido de 20 MB' ? 413 : 400).json({
        success: false,
        message: fileValidation.message,
      });
      return;
    }

    const { titulo, tipo, numero, fuente, fecha_publicacion }: UploadNormativaDto = req.body;
    const metadataValidation = NormativaService.validateMetadata({
      titulo,
      tipo,
      numero,
      fuente,
      fecha_publicacion,
    });

    if (!metadataValidation.valid) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(400).json({
        success: false,
        message: metadataValidation.message,
      });
      return;
    }

    const result = await NormativaService.createNormativa(
      {
        titulo: titulo.trim(),
        tipo,
        numero: numero.trim(),
        fuente: fuente.trim(),
        fecha_publicacion,
      },
      filePath
    );

    const pipeline = await processLegalDocument(result.version.id_version);
    const normativaActualizada = await NormativaService.getNormativaById(result.normativa.id_normativa);

    res.status(201).json({
      success: true,
      message: 'Documento cargado exitosamente',
      data: { ...result, normativa: normativaActualizada, pipeline },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cargar normativa';
    res.status(400).json({
      success: false,
      message,
    });
  }
};

/**
 * GET /api/normativa
 * Obtener todas las normativas
 */
export const getNormativasController = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.estado as string | undefined;

    const normativas = status
      ? await NormativaService.getNormativasByStatus(status)
      : await NormativaService.getNormativas();

    res.status(200).json({
      success: true,
      data: normativas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener normativas';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/normativa/:id
 * Obtener normativa por ID
 */
export const getNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const normativa = await NormativaService.getNormativaById(id);

    res.status(200).json({
      success: true,
      data: normativa,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener normativa';
    res.status(404).json({ success: false, message });
  }
};

/**
 * PATCH /api/normativa/:id
 * Actualizar normativa
 */
export const updateNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const data: UpdateNormativaDto = req.body;

    const normativa = await NormativaService.updateNormativa(id, data);

    res.status(200).json({
      success: true,
      message: NormativaService.getUpdateSuccessMessage(),
      data: normativa,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : NormativaService.getUpdateErrorMessage();
    res.status(400).json({
      success: false,
      message: message === 'No se pudo actualizar la normativa' ? NormativaService.getUpdateErrorMessage() : message,
    });
  }
};

export const uploadVersionNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo PDF válido',
      });
      return;
    }

    const filePath = path.join(PDF_STORAGE_PATH, req.file.filename);
    const fileValidation = NormativaService.validateFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!fileValidation.valid) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(fileValidation.message === 'El archivo excede el tamaño máximo permitido de 20 MB' ? 413 : 400).json({
        success: false,
        message: fileValidation.message,
      });
      return;
    }

    const metadata = req.body as UploadNormativaDto;
    const result = await NormativaService.addVersion(id, filePath, metadata);

    res.status(200).json({
      success: true,
      message: NormativaService.getUpdateSuccessMessage(),
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : NormativaService.getUpdateErrorMessage();
    res.status(400).json({
      success: false,
      message: message === 'No se pudo actualizar la normativa' ? NormativaService.getUpdateErrorMessage() : message,
    });
  }
};

/**
 * PATCH /api/normativa/:id/estado
 * Cambiar estado de normativa
 */
export const changeStatusController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const data: ChangeStatusDto = req.body;

    const normativa = await NormativaService.changeStatus(id, data);

    res.status(200).json({
      success: true,
      message: NormativaService.getUpdateSuccessMessage(),
      data: normativa,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : NormativaService.getUpdateErrorMessage();
    res.status(400).json({
      success: false,
      message: message === 'No se pudo actualizar la normativa' ? NormativaService.getUpdateErrorMessage() : message,
    });
  }
};

/**
 * POST /api/normativa/:id/activar
 * Activar normativa
 */
export const activateNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const normativa = await NormativaService.activate(id);

    res.status(200).json({
      success: true,
      message: 'Normativa activada correctamente',
      data: normativa,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al activar normativa';
    res.status(400).json({ success: false, message });
  }
};

/**
 * POST /api/normativa/:id/desactivar
 * Desactivar normativa
 */
export const deactivateNormativaController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const normativa = await NormativaService.deactivate(id);

    res.status(200).json({
      success: true,
      message: 'Normativa desactivada correctamente',
      data: normativa,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al desactivar normativa';
    res.status(400).json({ success: false, message });
  }
};

/**
 * GET /api/admin/normativa/estadisticas
 * Obtener estadísticas de normativa
 */
export const getNormativaStatisticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await NormativaService.getStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener estadísticas';
    res.status(500).json({ success: false, message });
  }
};
