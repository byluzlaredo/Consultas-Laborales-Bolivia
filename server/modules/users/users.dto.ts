// DTO para actualizar perfil
export interface UpdateProfileDto {
  nombre?: string;
  apellido?: string;
}

// DTO para cambiar contraseña (desde módulo de perfil)
export interface ChangePasswordDto {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirm: string;
}

// DTO para admin actualizar usuario
export interface AdminUpdateUserDto {
  nombre?: string;
  apellido?: string;
  rol?: 'USUARIO' | 'ADMINISTRADOR';
  activo?: boolean;
}
