import bcrypt from 'bcrypt';
import { queryDb, queryDbSingle, execDb } from '../../database/index.js';
import { getPasswordRequirementsMessage } from '../auth/passwordValidation.js';
import type {
  UpdateProfileDto,
  ChangePasswordDto,
  AdminUpdateUserDto,
  CreateAdminUserDto,
} from './users.dto.js';

interface UsuarioDb {
  id_usuario: number;
  nombre: string;
  apellido: string;
  departamento: import('../auth/auth.dto.js').DepartamentoBolivia | null;
  correo: string;
  password_hash: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

export interface UserResponse {
  id_usuario: number;
  nombre: string;
  apellido: string;
  departamento: import('../auth/auth.dto.js').DepartamentoBolivia | null;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

export class UsersService {
  static validateAdminUserInput(data: CreateAdminUserDto): { valid: boolean; error?: string } {
    if (
      typeof data?.nombre !== 'string' ||
      typeof data.apellido !== 'string' ||
      typeof data.correo !== 'string' ||
      typeof data.password !== 'string' ||
      typeof data.passwordConfirm !== 'string' ||
      !data.nombre.trim() ||
      !data.apellido.trim() ||
      !data.correo.trim() ||
      !data.password
    ) {
      return { valid: false, error: 'Por favor, complete todos los campos obligatorios.' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) {
      return { valid: false, error: 'El correo electrónico no es válido' };
    }

    const passwordError = getPasswordRequirementsMessage(data.password);
    if (passwordError) return { valid: false, error: passwordError };

    if (data.password !== data.passwordConfirm) {
      return { valid: false, error: 'Las contraseñas no coinciden' };
    }

    return { valid: true };
  }

  /**
   * Crear una cuenta administrativa. El rol se fija en el servidor.
   */
  static async createAdminUser(data: CreateAdminUserDto): Promise<UserResponse> {
    const validation = this.validateAdminUserInput(data);
    if (!validation.valid) throw new Error(validation.error);

    const nombre = data.nombre.trim();
    const apellido = data.apellido.trim();
    const correo = data.correo.trim().toLowerCase();
    const existing = await queryDbSingle<UsuarioDb>(
      'SELECT id_usuario FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [correo]
    );
    if (existing) throw new Error('El correo electrónico ya se encuentra registrado');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await queryDbSingle<UsuarioDb>(
      `INSERT INTO usuario (nombre, apellido, correo, password_hash, departamento, rol, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, NULL, 'ADMINISTRADOR', TRUE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [nombre, apellido, correo, passwordHash]
    );

    if (!user) throw new Error('No se pudo crear la cuenta administrativa');
    return this.toUserResponse(user);
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  static async getProfile(userId: number): Promise<UserResponse> {
    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE id_usuario = $1',
      [userId]
    );

    if (!user) throw new Error('Usuario no encontrado');

    return this.toUserResponse(user);
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateProfile(userId: number, data: UpdateProfileDto): Promise<UserResponse> {
    if (data.nombre !== undefined && !data.nombre.trim()) {
      throw new Error('El nombre no puede estar vacío');
    }
    if (data.apellido !== undefined && !data.apellido.trim()) {
      throw new Error('El apellido no puede estar vacío');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.apellido !== undefined) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(data.apellido);
    }

    if (updates.length === 0) {
      return this.getProfile(userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const user = await queryDbSingle<UsuarioDb>(
      `UPDATE usuario SET ${updates.join(', ')} WHERE id_usuario = $${paramIndex} RETURNING *`,
      values
    );

    if (!user) throw new Error('No se pudo actualizar el perfil');

    return this.toUserResponse(user);
  }

  /**
   * Cambiar contraseña del usuario
   */
  static async changePassword(userId: number, data: ChangePasswordDto): Promise<void> {
    if (data.passwordNueva !== data.passwordConfirm) {
      throw new Error('Las nuevas contraseñas no coinciden');
    }

    const newPassword = data.passwordNueva || '';
    const passwordError = getPasswordRequirementsMessage(newPassword);
    if (passwordError) throw new Error(passwordError);

    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE id_usuario = $1',
      [userId]
    );

    if (!user) throw new Error('Usuario no encontrado');

    const isValid = await bcrypt.compare(data.passwordActual, user.password_hash);
    if (!isValid) {
      throw new Error('La contraseña actual es incorrecta');
    }

    const newPasswordHash = await bcrypt.hash(data.passwordNueva, 10);
    await execDb(
      'UPDATE usuario SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
      [newPasswordHash, userId]
    );
  }

  /**
   * Obtener todos los usuarios (solo admin)
   */
  static async getAllUsers(): Promise<UserResponse[]> {
    const users = await queryDb<UsuarioDb>(
      'SELECT * FROM usuario ORDER BY fecha_registro DESC',
      []
    );

    return users.map((user) => this.toUserResponse(user));
  }

  /**
   * Obtener usuario por ID (solo admin)
   */
  static async getUserById(userId: number): Promise<UserResponse> {
    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE id_usuario = $1',
      [userId]
    );

    if (!user) throw new Error('Usuario no encontrado');

    return this.toUserResponse(user);
  }

  /**
   * Actualizar usuario (solo admin)
   */
  static async updateUser(userId: number, data: AdminUpdateUserDto): Promise<UserResponse> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      updates.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.apellido !== undefined) {
      updates.push(`apellido = $${paramIndex++}`);
      values.push(data.apellido);
    }

    if (data.rol !== undefined) {
      updates.push(`rol = $${paramIndex++}`);
      values.push(data.rol);
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (updates.length === 0) {
      return this.getUserById(userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const user = await queryDbSingle<UsuarioDb>(
      `UPDATE usuario SET ${updates.join(', ')} WHERE id_usuario = $${paramIndex} RETURNING *`,
      values
    );

    if (!user) throw new Error('No se pudo actualizar el usuario');

    return this.toUserResponse(user);
  }

  /**
   * Desactivar usuario (solo admin)
   */
  static async deactivateUser(userId: number): Promise<void> {
    await execDb(
      'UPDATE usuario SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [userId]
    );
  }

  /**
   * Convertir usuario BD a respuesta
   */
  static toUserResponse(user: UsuarioDb): UserResponse {
    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      apellido: user.apellido,
      departamento: user.departamento,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
      fecha_registro: user.fecha_registro,
      ultimo_acceso: user.ultimo_acceso,
    };
  }

  /**
   * Obtener estadísticas para admin
   */
  static async getStatistics(): Promise<{
    totalUsuarios: number;
    administradores: number;
    usuariosActivos: number;
  }> {
    const stats = await queryDbSingle<{
      total: number;
      admins: number;
      activos: number;
    }>(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN rol = 'ADMINISTRADOR' THEN 1 ELSE 0 END), 0) as admins,
        COALESCE(SUM(CASE WHEN activo = TRUE THEN 1 ELSE 0 END), 0) as activos
       FROM usuario`,
      []
    );

    return {
      totalUsuarios: stats?.total || 0,
      administradores: stats?.admins || 0,
      usuariosActivos: stats?.activos || 0,
    };
  }
}
