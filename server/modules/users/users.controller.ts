import type { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import type { UpdateProfileDto, ChangePasswordDto, AdminUpdateUserDto } from './users.dto.js';

/**
 * GET /api/users/profile
 * Obtener el perfil del usuario autenticado
 */
export const getProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const user = await UsersService.getProfile(userId);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener perfil';
    res.status(500).json({ success: false, message });
  }
};

/**
 * PATCH /api/users/profile
 * Actualizar el perfil del usuario autenticado
 */
export const updateProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const data: UpdateProfileDto = req.body;
    const user = await UsersService.updateProfile(userId, data);

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar perfil';
    res.status(400).json({ success: false, message });
  }
};

/**
 * POST /api/users/change-password
 * Cambiar contraseña del usuario autenticado
 */
export const changePasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    const data: ChangePasswordDto = req.body;
    await UsersService.changePassword(userId, data);

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
 * GET /api/admin/users
 * Obtener todos los usuarios (solo admin)
 */
export const getAllUsersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await UsersService.getAllUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener usuarios';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/admin/users/:id
 * Obtener usuario por ID (solo admin)
 */
export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID de usuario inválido' });
      return;
    }

    const user = await UsersService.getUserById(userId);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener usuario';
    res.status(error instanceof Error && message.includes('no encontrado') ? 404 : 500).json({
      success: false,
      message,
    });
  }
};

/**
 * PATCH /api/admin/users/:id
 * Actualizar usuario (solo admin)
 */
export const updateUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID de usuario inválido' });
      return;
    }

    const data: AdminUpdateUserDto = req.body;
    const user = await UsersService.updateUser(userId, data);

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al actualizar usuario';
    res.status(400).json({ success: false, message });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Desactivar usuario (solo admin)
 */
export const deactivateUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: 'ID de usuario inválido' });
      return;
    }

    await UsersService.deactivateUser(userId);

    res.status(200).json({
      success: true,
      message: 'Usuario desactivado correctamente',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al desactivar usuario';
    res.status(500).json({ success: false, message });
  }
};

/**
 * GET /api/admin/users/estadisticas
 * Obtener estadísticas de usuarios
 */
export const getUserStatisticsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await UsersService.getStatistics();
    res.status(200).json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener estadísticas';
    res.status(500).json({ success: false, message });
  }
};
