import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import {
  queryDb,
  queryDbSingle,
  execDb,
  getClient,
} from '../../database/index.js';
import { emailService } from '../email/email.service.js';
import { DEPARTAMENTOS_BOLIVIA } from './auth.dto.js';
import type {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  UserResponse,
  JwtPayload,
  DepartamentoBolivia,
  ValidateResetTokenDto,
} from './auth.dto.js';

// Interfaz para usuario en BD
interface UsuarioDb {
  id_usuario: number;
  nombre: string;
  apellido: string;
  departamento: DepartamentoBolivia | null;
  correo: string;
  password_hash: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

// Interfaz para token de recuperación
interface TokenRecuperacion {
  id_token: number;
  id_usuario: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  expired: boolean;
}

export class AuthService {
  /**
   * Asegurar que exista el usuario administrador por defecto en desarrollo
   */
  static async ensureDemoAdmin(): Promise<void> {
    await execDb('ALTER TABLE usuario ADD COLUMN IF NOT EXISTS departamento VARCHAR(50)');
    await execDb(`UPDATE usuario SET rol = CASE
      WHEN UPPER(TRIM(rol)) IN ('ADMINISTRADOR', 'ADMIN') THEN 'ADMINISTRADOR'
      ELSE 'USUARIO'
    END`);
    await execDb(`CREATE TABLE IF NOT EXISTS tokens_revocados (
      token_hash VARCHAR(64) PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL
    )`);
    const adminEmail = config.admin.email;
    const adminPassword = config.admin.password;
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const existing = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [adminEmail]
    );

    if (existing) {
      await execDb(
        `UPDATE usuario
         SET nombre = COALESCE(nombre, 'Administrador'),
             apellido = COALESCE(apellido, 'Demo'),
             correo = LOWER($2),
             password_hash = $3,
             rol = 'ADMINISTRADOR',
             activo = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_usuario = $1`,
        [existing.id_usuario, adminEmail, passwordHash]
      );
      return;
    }

    await execDb(
      `INSERT INTO usuario (nombre, apellido, correo, password_hash, rol, activo, fecha_registro, updated_at)
       VALUES ($1, $2, $3, $4, 'ADMINISTRADOR', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      ['Administrador', 'Demo', adminEmail, passwordHash]
    );
  }

  /**
   * Validar que los datos de registro sean válidos
   */
  static validateRegisterInput(data: RegisterDto): { valid: boolean; error?: string } {
    if (!data.nombre?.trim() || !data.apellido?.trim() || !data.correo?.trim() || !data.password) {
      return { valid: false, error: 'Por favor, complete todos los campos obligatorios.' };
    }
    if (!data.nombre?.trim()) return { valid: false, error: 'El nombre es requerido' };
    if (!data.apellido?.trim()) return { valid: false, error: 'El apellido es requerido' };
    if (!DEPARTAMENTOS_BOLIVIA.includes(data.departamento)) return { valid: false, error: 'Selecciona un departamento de Bolivia' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
      return { valid: false, error: 'El correo electrónico no es válido' };
    }
    if (data.password.length < 8) {
      return { valid: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password) || !/[!@#$%^&*]/.test(data.password)) {
      return { valid: false, error: 'La contraseña debe contener mayúscula, número y carácter especial' };
    }
    if (data.password !== data.passwordConfirm) {
      return { valid: false, error: 'Las contraseñas no coinciden' };
    }
    return { valid: true };
  }

  /**
   * Registrar un nuevo usuario
   */
  static async register(data: RegisterDto): Promise<{ user: UserResponse; token: string }> {
    const normalizedData: RegisterDto = {
      ...data,
      nombre: data.nombre?.trim() || '',
      apellido: data.apellido?.trim() || '',
      correo: data.correo?.trim().toLowerCase() || '',
    };
    const validation = this.validateRegisterInput(normalizedData);
    if (!validation.valid) throw new Error(validation.error);

    // Verificar si el correo ya existe
    const existing = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [normalizedData.correo]
    );
    if (existing) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Insertar usuario con rol USUARIO por defecto
    const result = await queryDbSingle<UsuarioDb>(
      `INSERT INTO usuario (nombre, apellido, correo, password_hash, departamento, rol, activo, fecha_registro)
       VALUES ($1, $2, $3, $4, $5, 'USUARIO', TRUE, CURRENT_TIMESTAMP)
       RETURNING *`,
      [normalizedData.nombre, normalizedData.apellido, normalizedData.correo, passwordHash, normalizedData.departamento]
    );

    if (!result) throw new Error('No se pudo crear el usuario');

    const userResponse = this.toUserResponse(result);
    const token = this.generateToken(result);

    return { user: userResponse, token };
  }

  /**
   * Validar credenciales de login
   */
  static async login(data: LoginDto): Promise<{ user: UserResponse; token: string }> {
    if (!data.correo?.trim() || !data.password?.trim()) {
      throw new Error('Correo electrónico o contraseña incorrectos');
    }

    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [data.correo]
    );

    if (!user) {
      throw new Error('Correo electrónico o contraseña incorrectos');
    }

    if (!user.activo) {
      throw new Error('La cuenta ha sido desactivada');
    }

    // Comparar contraseña con hash
    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      throw new Error('Correo electrónico o contraseña incorrectos');
    }

    // Actualizar último acceso
    await execDb(
      'UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [user.id_usuario]
    );

    const userResponse = this.toUserResponse(user);
    const token = this.generateToken(user);

    return { user: userResponse, token };
  }

  /**
   * Cambiar contraseña
   */
  static async changePassword(userId: number, data: ChangePasswordDto): Promise<void> {
    if (data.passwordNueva !== data.passwordConfirm) {
      throw new Error('Las nuevas contraseñas no coinciden');
    }

    this.validateNewPassword(data.passwordNueva);

    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE id_usuario = $1',
      [userId]
    );

    if (!user) throw new Error('Usuario no encontrado');

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(data.passwordActual, user.password_hash);
    if (!isValid) {
      throw new Error('La contraseña actual es incorrecta');
    }

    // Hash de nueva contraseña
    const newPasswordHash = await bcrypt.hash(data.passwordNueva, 10);

    await execDb(
      'UPDATE usuario SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
      [newPasswordHash, userId]
    );
  }

  /**
   * Solicitar recuperación de contraseña
   */
  static async forgotPassword(data: ForgotPasswordDto): Promise<{ token: string; expiresIn: number }> {
    const correo = data.correo?.trim().toLowerCase() || '';
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new Error('El correo electrónico no es válido');
    }
    const user = await queryDbSingle<UsuarioDb>(
      'SELECT * FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [correo]
    );

    if (!user) {
      // No revelar si el correo existe o no
      return { token: 'token_enviado', expiresIn: 3600 };
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);

    await execDb(
      `INSERT INTO tokens_recuperacion (id_usuario, token_hash, expires_at, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP::timestamp + ($3 * INTERVAL '1 second'), CURRENT_TIMESTAMP)`,
      [user.id_usuario, tokenHash, config.resetTokenExpirySeconds]
    );

    await emailService.sendPasswordResetEmail(user.correo, token);

    return { token: 'token_enviado', expiresIn: config.resetTokenExpirySeconds };
  }

  /**
   * Resetear contraseña con token
   */
  static async resetPassword(data: ResetPasswordDto): Promise<void> {
    if (!data.token?.trim()) {
      throw new Error('Token no proporcionado');
    }

    if (data.passwordNueva !== data.passwordConfirm) {
      throw new Error('Las contraseñas no coinciden');
    }

    this.validateNewPassword(data.passwordNueva);

    const tokenRecords = await queryDb<TokenRecuperacion>(
      'SELECT *, expires_at <= CURRENT_TIMESTAMP AS expired FROM tokens_recuperacion ORDER BY created_at DESC'
    );

    if (tokenRecords.length === 0) {
      throw new Error('Token inválido o expirado');
    }

    const matchingToken = await Promise.all(
      tokenRecords.map(async (tokenRecord) => {
        const isValid = await bcrypt.compare(data.token, tokenRecord.token_hash);
        return isValid ? tokenRecord : null;
      })
    );

    const tokenRecord = matchingToken.find((record): record is TokenRecuperacion => record !== null);

    if (!tokenRecord) {
      throw new Error('Token inválido');
    }

    if (tokenRecord.used_at) {
      throw new Error('El enlace de recuperación ya fue utilizado');
    }
    if (tokenRecord.expired) {
      throw new Error('El enlace de recuperación ha expirado');
    }

    const newPasswordHash = await bcrypt.hash(data.passwordNueva, 10);
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const consumed = await client.query(
        'UPDATE tokens_recuperacion SET used_at = CURRENT_TIMESTAMP WHERE id_token = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP RETURNING id_usuario',
        [tokenRecord.id_token]
      );
      if (consumed.rowCount !== 1) {
        await client.query('ROLLBACK');
        throw new Error('Token inválido o ya utilizado');
      }
      await client.query(
        'UPDATE usuario SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2',
        [newPasswordHash, tokenRecord.id_usuario]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  static validateNewPassword(password: string): void {
    if (!password || password.length < 8) throw new Error('La contraseña no cumple con los requisitos mínimos de seguridad.');
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new Error('La contraseña no cumple con los requisitos mínimos de seguridad.');
    }
  }

  static async validateResetToken(data: ValidateResetTokenDto): Promise<void> {
    if (!data.token?.trim()) throw new Error('Token no proporcionado');
    const tokenRecords = await queryDb<TokenRecuperacion>(
      'SELECT *, expires_at <= CURRENT_TIMESTAMP AS expired FROM tokens_recuperacion ORDER BY created_at DESC'
    );
    const matchingToken = (await Promise.all(tokenRecords.map(async (record) => (
      await bcrypt.compare(data.token, record.token_hash) ? record : null
    )))).find((record): record is TokenRecuperacion => record !== null);
    if (!matchingToken) throw new Error('El enlace de recuperación no es válido');
    if (matchingToken.used_at) throw new Error('El enlace de recuperación ya fue utilizado');
    if (matchingToken.expired) {
      throw new Error('El enlace de recuperación ha expirado');
    }
  }

  static async getActiveUserPayload(payload: JwtPayload): Promise<JwtPayload> {
    const user = await queryDbSingle<Pick<UsuarioDb, 'id_usuario' | 'correo' | 'rol' | 'activo'>>(
      'SELECT id_usuario, correo, rol, activo FROM usuario WHERE id_usuario = $1',
      [payload.id]
    );
    if (!user || !user.activo) throw new Error('La sesión ya no es válida');
    return { id: user.id_usuario, correo: user.correo, rol: user.rol };
  }

  static async revokeToken(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await execDb(
      `INSERT INTO tokens_revocados (token_hash, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, this.getTokenExpiry(token)]
    );
  }

  static getTokenExpiry(token: string): Date {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    return decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  static async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const revoked = await queryDbSingle<{ token_hash: string }>(
      'SELECT token_hash FROM tokens_revocados WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP',
      [tokenHash]
    );
    return Boolean(revoked);
  }

  /**
   * Generar JWT token
   */
  static generateToken(user: UsuarioDb): string {
    const payload: JwtPayload = {
      id: user.id_usuario,
      correo: user.correo,
      rol: user.rol,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  /**
   * Verificar token JWT
   */
  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  }

  /**
   * Convertir usuario BD a respuesta sin contraseña
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
}
