import { v4 as uuidv4 } from 'uuid';
import { queryDb, queryDbSingle, execDb } from '../../database/index.js';
import type {
  UploadNormativaDto,
  UpdateNormativaDto,
  ChangeStatusDto,
  NormativaResponse,
  VersionResponse,
} from './normativa.dto.js';

interface NormativaDb {
  id_normativa: string;
  titulo: string;
  tipo: string;
  numero: string;
  fuente: string;
  fecha_publicacion: string | null;
  estado: string;
  fecha_creacion: string;
}

interface VersionDb {
  id_version: string;
  id_normativa: string;
  numero_version: number;
  archivo_url: string;
  estado: string;
  fecha_version: string;
  fecha_creacion: string;
}

export class NormativaService {
  static readonly allowedTypes = ['Ley', 'Decreto Supremo', 'Resolución Ministerial'];

  static normalizeStatus(status?: string): string {
    const value = `${status ?? ''}`.trim();
    if (!value) return 'PENDIENTE_PROCESAMIENTO';

    const upper = value.toUpperCase();
    if (upper === 'ACTIVO' || upper === 'VIGENTE') return 'ACTIVO';
    if (upper === 'INACTIVO' || upper === 'NO_VIGENTE' || upper === 'DESACTIVADO') return 'INACTIVO';
    if (upper.includes('PENDIENTE')) return 'PENDIENTE_PROCESAMIENTO';
    if (upper.includes('PROCESANDO')) return 'PROCESANDO';
    if (upper.includes('ERROR')) return 'ERROR';
    if (upper.includes('DEROGADA')) return 'DEROGADA';
    if (upper.includes('MODIFICADA')) return 'MODIFICADA';
    return upper;
  }

  static formatStatus(status?: string): string {
    const value = this.normalizeStatus(status);
    const map: Record<string, string> = {
      ACTIVO: 'ACTIVO',
      INACTIVO: 'INACTIVO',
      PENDIENTE_PROCESAMIENTO: 'Pendiente de Procesamiento',
      PROCESANDO: 'PROCESANDO',
      DEROGADA: 'DEROGADA',
      MODIFICADA: 'MODIFICADA',
      ERROR: 'ERROR',
    };
    return map[value] ?? value;
  }

  static getUpdateSuccessMessage(): string {
    return 'Estado normativo actualizado correctamente.';
  }

  static getUpdateErrorMessage(): string {
    return 'No se pudo actualizar el registro normativo seleccionado.';
  }

  static validateFile(file: { originalname?: string; mimetype?: string; size?: number }): { valid: boolean; message?: string } {
    const fileName = file.originalname ?? '';
    const isPdf = file.mimetype === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return { valid: false, message: 'Formato de archivo no válido. Solo se permiten archivos PDF' };
    }

    if ((file.size ?? 0) > 20 * 1024 * 1024) {
      return { valid: false, message: 'El archivo excede el tamaño máximo permitido de 20 MB' };
    }

    return { valid: true };
  }

  static validateMetadata(data: Partial<UploadNormativaDto>): { valid: boolean; message?: string } {
    const missing: string[] = [];

    if (!String(data.titulo ?? '').trim()) missing.push('Título');
    if (!String(data.tipo ?? '').trim()) missing.push('Tipo');
    if (!String(data.numero ?? '').trim()) missing.push('Número');
    if (!String(data.fuente ?? '').trim()) missing.push('Fuente');
    if (!String(data.fecha_publicacion ?? '').trim()) missing.push('Fecha de Publicación');

    if (missing.length > 0) {
      return { valid: false, message: `Faltan campos obligatorios: ${missing.join(', ')}` };
    }

    if (!this.allowedTypes.includes(String(data.tipo))) {
      return {
        valid: false,
        message: 'Tipo de norma inválido. Debe ser: Ley, Decreto Supremo o Resolución Ministerial',
      };
    }

    return { valid: true };
  }

  static async createNormativa(
    data: UploadNormativaDto,
    archivo_path: string
  ): Promise<{ normativa: NormativaResponse; version: VersionResponse }> {
    const metadataValidation = this.validateMetadata(data);
    if (!metadataValidation.valid) {
      throw new Error(metadataValidation.message);
    }

    const date = new Date(data.fecha_publicacion);
    if (isNaN(date.getTime())) {
      throw new Error('Fecha de publicación inválida');
    }

    const id_normativa = uuidv4();
    const id_version = uuidv4();

    await execDb(
      `INSERT INTO normativa (id_normativa, titulo, tipo, numero, fuente, fecha_publicacion, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE_PROCESAMIENTO')`,
      [
        id_normativa,
        data.titulo.trim(),
        data.tipo,
        data.numero.trim(),
        data.fuente.trim(),
        data.fecha_publicacion,
      ],
      true
    );

    await execDb(
      `INSERT INTO documento_legal (id_documento, id_normativa, nombre, url_fuente, version, total_paginas)
       VALUES ($1, $2, $3, $4, '1', NULL)`,
      [id_version, id_normativa, `${data.titulo.trim()}_v1.pdf`, archivo_path],
      true
    );

    return {
      normativa: {
        id_normativa,
        titulo: data.titulo.trim(),
        tipo: data.tipo,
        numero: data.numero.trim(),
        fuente: data.fuente.trim(),
        fecha_publicacion: data.fecha_publicacion,
        estado: 'Pendiente de Procesamiento',
        fecha_creacion: new Date().toISOString(),
        version: 1,
        activa: false,
      },
      version: {
        id_version,
        id_normativa,
        numero_version: 1,
        archivo_url: archivo_path,
        estado: 'PENDIENTE_PROCESAMIENTO',
        fecha_version: new Date().toISOString(),
        fecha_creacion: new Date().toISOString(),
      },
    };
  }

  static async addVersion(id_normativa: string, archivo_path: string, metadata?: Partial<UploadNormativaDto>): Promise<NormativaResponse> {
    if (!archivo_path) {
      throw new Error('Debe adjuntar un archivo PDF válido');
    }

    const nextVersion = await queryDbSingle<{ next_version: number }>(
      `SELECT COALESCE(MAX(CAST(version AS INTEGER)), 0) + 1 AS next_version
       FROM documento_legal WHERE id_normativa = $1`,
      [id_normativa],
      true
    );

    const versionNumber = nextVersion?.next_version ?? 1;
    const id_documento = uuidv4();

    await execDb(
      `INSERT INTO documento_legal (id_documento, id_normativa, nombre, url_fuente, version, total_paginas)
       VALUES ($1, $2, $3, $4, $5, NULL)`,
      [id_documento, id_normativa, `version_${versionNumber}.pdf`, archivo_path, String(versionNumber)],
      true
    );

    if (metadata) {
      const dataForUpdate: UpdateNormativaDto = {};
      if (metadata.titulo) dataForUpdate.titulo = metadata.titulo.trim();
      if (metadata.tipo) dataForUpdate.tipo = metadata.tipo;
      if (metadata.numero) dataForUpdate.numero = metadata.numero.trim();
      if (metadata.fuente) dataForUpdate.fuente = metadata.fuente.trim();
      if (metadata.fecha_publicacion) dataForUpdate.fecha_publicacion = metadata.fecha_publicacion;
      if (Object.keys(dataForUpdate).length > 0) {
        await this.updateNormativa(id_normativa, dataForUpdate);
      }
    }

    return this.getNormativaById(id_normativa);
  }

  static async getNormativas(): Promise<NormativaResponse[]> {
    const normativas = await queryDb<NormativaDb>(
      `SELECT * FROM normativa ORDER BY fecha_creacion DESC`,
      [],
      true
    );

    return normativas.map((n) => ({
      id_normativa: n.id_normativa,
      titulo: n.titulo,
      tipo: n.tipo,
      numero: n.numero,
      fuente: n.fuente,
      fecha_publicacion: n.fecha_publicacion,
      estado: this.formatStatus(n.estado),
      fecha_creacion: n.fecha_creacion,
      version: 1,
      activa: n.estado === 'ACTIVO',
    }));
  }

  static async getNormativaById(id: string): Promise<NormativaResponse> {
    const normativa = await queryDbSingle<NormativaDb>(
      'SELECT * FROM normativa WHERE id_normativa = $1',
      [id],
      true
    );

    if (!normativa) throw new Error('Normativa no encontrada');

    return {
      id_normativa: normativa.id_normativa,
      titulo: normativa.titulo,
      tipo: normativa.tipo,
      numero: normativa.numero,
      fuente: normativa.fuente,
      fecha_publicacion: normativa.fecha_publicacion,
      estado: this.formatStatus(normativa.estado),
      fecha_creacion: normativa.fecha_creacion,
      version: 1,
      activa: normativa.estado === 'ACTIVO',
    };
  }

  static async updateNormativa(id: string, data: UpdateNormativaDto): Promise<NormativaResponse> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.titulo !== undefined) {
      updates.push(`titulo = $${paramIndex++}`);
      values.push(data.titulo.trim());
    }

    if (data.tipo !== undefined) {
      updates.push(`tipo = $${paramIndex++}`);
      values.push(data.tipo);
    }

    if (data.numero !== undefined) {
      updates.push(`numero = $${paramIndex++}`);
      values.push(data.numero.trim());
    }

    if (data.fuente !== undefined) {
      updates.push(`fuente = $${paramIndex++}`);
      values.push(data.fuente.trim());
    }

    if (data.fecha_publicacion !== undefined) {
      updates.push(`fecha_publicacion = $${paramIndex++}`);
      values.push(data.fecha_publicacion);
    }

    if (data.estado !== undefined) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(this.normalizeStatus(data.estado));
    }

    if (updates.length === 0) {
      return this.getNormativaById(id);
    }

    values.push(id);

    const normativa = await queryDbSingle<NormativaDb>(
      `UPDATE normativa SET ${updates.join(', ')} WHERE id_normativa = $${paramIndex} RETURNING *`,
      values,
      true
    );

    if (!normativa) throw new Error('No se pudo actualizar la normativa');

    return {
      id_normativa: normativa.id_normativa,
      titulo: normativa.titulo,
      tipo: normativa.tipo,
      numero: normativa.numero,
      fuente: normativa.fuente,
      fecha_publicacion: normativa.fecha_publicacion,
      estado: this.formatStatus(normativa.estado),
      fecha_creacion: normativa.fecha_creacion,
      version: 1,
      activa: normativa.estado === 'ACTIVO',
    };
  }

  static async changeStatus(id: string, status: ChangeStatusDto): Promise<NormativaResponse> {
    const estado = this.normalizeStatus(status.estado) as
      | 'PENDIENTE_PROCESAMIENTO'
      | 'PROCESANDO'
      | 'ACTIVO'
      | 'DEROGADA'
      | 'MODIFICADA'
      | 'INACTIVO'
      | 'ERROR';

    if (!['ACTIVO', 'DEROGADA', 'MODIFICADA', 'INACTIVO', 'PENDIENTE_PROCESAMIENTO', 'PROCESANDO', 'ERROR'].includes(estado)) {
      throw new Error('Estado de normativa inválido');
    }
    return this.updateNormativa(id, { estado });
  }

  static async activate(id: string): Promise<NormativaResponse> {
    return this.changeStatus(id, { estado: 'ACTIVO' });
  }

  static async deactivate(id: string): Promise<NormativaResponse> {
    return this.changeStatus(id, { estado: 'INACTIVO' });
  }

  static async getStatistics(): Promise<{
    totalNormativas: number;
    activas: number;
    inactivas: number;
    pendienteProcesamiento: number;
    procesando: number;
    conError: number;
  }> {
    const stats = await queryDbSingle<{
      total: number;
      activas: number;
      inactivas: number;
      pendiente: number;
      procesando: number;
      error: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN estado = 'ACTIVO' THEN 1 ELSE 0 END), 0) as activas,
        COALESCE(SUM(CASE WHEN estado = 'INACTIVO' THEN 1 ELSE 0 END), 0) as inactivas,
        COALESCE(SUM(CASE WHEN estado = 'PENDIENTE_PROCESAMIENTO' THEN 1 ELSE 0 END), 0) as pendiente,
        COALESCE(SUM(CASE WHEN estado = 'PROCESANDO' THEN 1 ELSE 0 END), 0) as procesando,
        COALESCE(SUM(CASE WHEN estado = 'ERROR' THEN 1 ELSE 0 END), 0) as error
       FROM normativa`,
      [],
      true
    );

    return {
      totalNormativas: stats?.total || 0,
      activas: stats?.activas || 0,
      inactivas: stats?.inactivas || 0,
      pendienteProcesamiento: stats?.pendiente || 0,
      procesando: stats?.procesando || 0,
      conError: stats?.error || 0,
    };
  }

  static async getNormativasByStatus(status: string): Promise<NormativaResponse[]> {
    const normalizedStatus = this.normalizeStatus(status);
    const normativas = await queryDb<NormativaDb>(
      `SELECT * FROM normativa WHERE estado = $1 ORDER BY fecha_creacion DESC`,
      [normalizedStatus],
      true
    );

    return normativas.map((n) => ({
      id_normativa: n.id_normativa,
      titulo: n.titulo,
      tipo: n.tipo,
      numero: n.numero,
      fuente: n.fuente,
      fecha_publicacion: n.fecha_publicacion,
      estado: this.formatStatus(n.estado),
      fecha_creacion: n.fecha_creacion,
      version: 1,
      activa: n.estado === 'ACTIVO',
    }));
  }
}
