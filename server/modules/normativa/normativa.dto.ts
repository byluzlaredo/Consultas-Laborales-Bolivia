// DTO para carga de normativa
export interface UploadNormativaDto {
  titulo: string;
  tipo: 'Ley' | 'Decreto Supremo' | 'Resolución Ministerial';
  numero: string;
  fuente: string;
  fecha_publicacion: string; // YYYY-MM-DD
}

// DTO para actualizar normativa
export interface UpdateNormativaDto {
  titulo?: string;
  tipo?: 'Ley' | 'Decreto Supremo' | 'Resolución Ministerial';
  numero?: string;
  fuente?: string;
  fecha_publicacion?: string;
  estado?: 'PENDIENTE_PROCESAMIENTO' | 'PROCESANDO' | 'ACTIVO' | 'DEROGADA' | 'MODIFICADA' | 'INACTIVO' | 'ERROR';
}

// DTO para cambiar estado
export interface ChangeStatusDto {
  estado: 'PENDIENTE_PROCESAMIENTO' | 'PROCESANDO' | 'ACTIVO' | 'DEROGADA' | 'MODIFICADA' | 'INACTIVO' | 'ERROR';
  errorMessage?: string;
}

// Response de normativa
export interface NormativaResponse {
  id_normativa: string;
  titulo: string;
  tipo: string;
  numero: string;
  fuente: string;
  fecha_publicacion: string | null;
  estado: string;
  fecha_creacion: string;
  version: number;
  activa: boolean;
}

// Response de versión
export interface VersionResponse {
  id_version: string;
  id_normativa: string;
  numero_version: number;
  archivo_url: string;
  estado: string;
  fecha_version: string;
  fecha_creacion: string;
}
