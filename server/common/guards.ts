import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service.js';
import type { JwtPayload } from '../modules/auth/auth.dto.js';

// Extender el tipo de Request para incluir usuario
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: Verificar autenticación JWT
 * Extrae el token del header Authorization y lo valida
 */
export const authGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = AuthService.verifyToken(token);
    if (await AuthService.isTokenRevoked(token)) {
      res.status(401).json({ success: false, message: 'La sesión ya no es válida' });
      return;
    }
    (req as any).user = await AuthService.getActiveUserPayload(payload);
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token inválido';
    res.status(401).json({
      success: false,
      message,
    });
  }
};

/**
 * Middleware: Verificar que el usuario sea administrador
 * Debe ir después de authGuard
 */
export const rolesGuard = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'No autorizado',
        });
        return;
      }

      if (!requiredRoles.includes(user.rol)) {
        res.status(403).json({
          success: false,
          message: 'Acceso denegado: permisos insuficientes',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
      });
    }
  };
};

/**
 * Middleware: Verificar que el usuario sea administrador
 * Abreviación de rolesGuard(['ADMINISTRADOR'])
 */
export const adminGuard = rolesGuard(['ADMINISTRADOR']);

/**
 * Middleware: Verificar que el usuario sea usuario normal
 */
export const userGuard = rolesGuard(['USUARIO', 'ADMINISTRADOR']);
