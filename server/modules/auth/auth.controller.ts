import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateResetTokenDto,
  AuthResponse,
} from './auth.dto.js';

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario
 */
export const registerController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: RegisterDto = req.body;
    const result = await AuthService.register(data);

    const response: AuthResponse = {
      success: true,
      message: 'Usuario registrado correctamente',
      user: result.user,
      token: result.token,
    };

    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar usuario';
    const response: AuthResponse = {
      success: false,
      message,
    };

    if (message.includes('ya se encuentra registrado') || (error as { code?: string })?.code === '23505') {
      res.status(409).json(response);
    } else if (
      message.includes('debe tener') ||
      message.includes('debe contener') ||
      message.includes('no coinciden') ||
      message.includes('es requerido') ||
      message.includes('campos obligatorios') ||
      message.includes('Selecciona') ||
      message.includes('no es válido')
    ) {
      res.status(400).json(response);
    } else {
      res.status(500).json(response);
    }
  }
};

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: LoginDto = req.body;
    const result = await AuthService.login(data);

    const response: AuthResponse = {
      success: true,
      message: 'Sesión iniciada correctamente',
      user: result.user,
      token: result.token,
    };

    res.status(200).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
    const response: AuthResponse = {
      success: false,
      message,
    };

    res.status(401).json(response);
  }
};

/**
 * POST /api/auth/change-password
 * Cambiar contraseña (requiere autenticación)
 */
export const changePasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const data: ChangePasswordDto = req.body;
    await AuthService.changePassword(userId, data);

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al cambiar contraseña';
    res.status(400).json({ success: false, message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
export const forgotPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: ForgotPasswordDto = req.body;
    const result = await AuthService.forgotPassword(data);

    res.status(200).json({
      success: true,
      message: 'Si el correo existe, recibirá un enlace de recuperación',
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error en recuperación de contraseña';
    res.status(500).json({ success: false, message });
  }
};

/**
 * POST /api/auth/reset-password
 * Resetear contraseña con token
 */
export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: ResetPasswordDto = req.body;
    await AuthService.resetPassword(data);

    res.status(200).json({
      success: true,
      message: 'Contraseña restablecida correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al restablecer contraseña';
    res.status(400).json({ success: false, message });
  }
};

export const validateResetTokenController = async (req: Request, res: Response): Promise<void> => {
  try {
    const data: ValidateResetTokenDto = { token: String(req.query.token || '') };
    await AuthService.validateResetToken(data);
    res.status(200).json({ success: true, valid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token inválido o expirado';
    res.status(400).json({ success: false, valid: false, message });
  }
};

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : '';
  if (!token) {
    res.status(401).json({ success: false, message: 'Token no proporcionado' });
    return;
  }
  await AuthService.revokeToken(token);
  res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
};
