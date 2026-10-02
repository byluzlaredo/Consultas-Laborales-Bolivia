export type UserRole = 'USUARIO' | 'ADMINISTRADOR';
export const DEPARTAMENTOS_BOLIVIA = ['Chuquisaca', 'La Paz', 'Cochabamba', 'Oruro', 'Potosí', 'Tarija', 'Santa Cruz', 'Beni', 'Pando'] as const;
export type DepartamentoBolivia = (typeof DEPARTAMENTOS_BOLIVIA)[number];

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  departamento: DepartamentoBolivia | null;
  correo: string;
  rol: UserRole;
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

export interface Sesion {
  id_sesion?: number;
  id_usuario: number;
  token: string;
  ip?: string;
  dispositivo?: string;
  fecha_inicio?: string;
  fecha_fin?: string | null;
  estado?: string;
}

export interface CredencialesLogin {
  correo: string;
  password: string;
}

export interface RegistroUsuarioInput {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  passwordConfirm?: string;
  departamento: DepartamentoBolivia;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Usuario;
  token?: string;
}
