export const DEPARTAMENTOS_BOLIVIA = [
  'Chuquisaca',
  'La Paz',
  'Cochabamba',
  'Oruro',
  'Potosí',
  'Tarija',
  'Santa Cruz',
  'Beni',
  'Pando',
] as const;

export type DepartamentoBolivia = (typeof DEPARTAMENTOS_BOLIVIA)[number];

// DTO para registro de usuario
export interface RegisterDto {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  passwordConfirm: string;
  departamento: DepartamentoBolivia;
}

// DTO para login
export interface LoginDto {
  correo: string;
  password: string;
}

// DTO para cambio de contraseña
export interface ChangePasswordDto {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirm: string;
}

// DTO para solicitud de recuperación
export interface ForgotPasswordDto {
  correo: string;
}

// DTO para reset de contraseña
export interface ResetPasswordDto {
  token: string;
  passwordNueva: string;
  passwordConfirm: string;
}

export interface ValidateResetTokenDto {
  token: string;
}

// DTO para actualizar perfil
export interface UpdateProfileDto {
  nombre?: string;
  apellido?: string;
}

// Respuesta de autenticación
export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserResponse;
}

// Usuario en respuesta (sin contraseña)
export interface UserResponse {
  id_usuario: number;
  nombre: string;
  apellido: string;
  departamento: DepartamentoBolivia | null;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

// Payload del JWT
export interface JwtPayload {
  id: number;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
}
