import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import multer from 'multer';
import { processLegalDocument } from './ragPipelineController';
import { ingestNormativaPdf } from '../services/pdfIngestionService';

const PDF_STORAGE_PATH = path.resolve(process.env.PDF_DIRECTORY || 'src/PDF');
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadNormativa = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Debe adjuntar un archivo PDF válido.',
      });
      return;
    }

    const filePath = path.join(PDF_STORAGE_PATH, req.file.filename);
    const sizeInMb = req.file.size / (1024 * 1024);

    if (req.file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(filePath);
      res.status(400).json({
        success: false,
        message: 'El archivo excede el tamaño máximo permitido de 20 MB',
      });
      return;
    }

    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      fs.unlinkSync(filePath);
      res.status(400).json({
        success: false,
        message: 'Formato de archivo no válido. Solo se permiten archivos PDF',
      });
      return;
    }

    const { titulo, tipo, numero, fuente, fechaPublicacion } = req.body;

    if (!titulo || !tipo || !numero || !fuente || !fechaPublicacion) {
      fs.unlinkSync(filePath);
      res.status(400).json({
        success: false,
        message: 'Complete todos los metadatos obligatorios.',
      });
      return;
    }

    const result = await ingestNormativaPdf({
      titulo,
      tipo,
      numero,
      fuente,
      fechaPublicacion,
      filePath,
      fileName: req.file.filename,
      sizeMb: Number(sizeInMb.toFixed(2)),
    });

    const automatico = req.body.automatico === 'true' || process.env.AUTO_PROCESS_RAG === 'true';
    const pipeline = automatico ? await processLegalDocument(result.documentoId) : undefined;

    res.status(201).json({
      success: true,
      message: 'Normativa cargada y registrada correctamente.',
      data: { ...result, pipeline },
    });
  } catch (error) {
    if (req.file) {
      const uploadedPath = path.join(PDF_STORAGE_PATH, req.file.filename);
      if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    }
    const message = error instanceof Error ? error.message : 'Error inesperado al procesar la normativa.';
    res.status(500).json({
      success: false,
      message,
    });
  }
};
