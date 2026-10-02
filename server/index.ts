import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateRuntimeConfig } from './config/index.js';
import { authGuard, adminGuard } from './common/guards.js';
import { AuthService } from './modules/auth/auth.service.js';
import { queryDb } from './database/index.js';

// Controladores de autenticación
import {
  registerController,
  loginController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
  validateResetTokenController,
  logoutController,
} from './modules/auth/auth.controller.js';

// Controladores de usuarios
import {
  getProfileController,
  updateProfileController,
  changePasswordController as userChangePasswordController,
  getAllUsersController,
  getUserByIdController,
  updateUserController,
  deactivateUserController,
  getUserStatisticsController,
} from './modules/users/users.controller.js';

// Controladores de normativa (nuevo módulo)
import {
  upload,
  uploadNormativaController,
  getNormativasController,
  getNormativaController,
  updateNormativaController,
  uploadVersionNormativaController,
  changeStatusController,
  activateNormativaController,
  deactivateNormativaController,
  getNormativaStatisticsController,
} from './modules/normativa/normativa.controller.js';

// Controladores de procesamiento
import { processingController } from './modules/processing/processing.controller.js';

// Controladores existentes
import { processDocument, processNormativa } from './controllers/ragPipelineController.js';
import { getAIConfig, saveAIConfig } from './controllers/aiConfigController.js';
import { getChat, getChats, postChatQuery } from './controllers/chatController.js';
import { calculateBenefits, createLaborDocument, getHistory } from './controllers/laboralController.js';

const app = express();
const PORT = config.server.port;

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(
  cors({
    origin: config.server.frontendUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (_req: Request, res: Response) => {
  const health: {
    ok: boolean;
    message: string;
    timestamp: string;
    checks: {
      databaseSistema: string;
      databaseVectorial: string;
    };
  } = {
    ok: true,
    message: 'JusticIA - Consulta Laboral Bolivia API running',
    timestamp: new Date().toISOString(),
    checks: {
      databaseSistema: 'unknown',
      databaseVectorial: 'unknown',
    },
  };

  try {
    await queryDb('SELECT 1', [], false);
    health.checks.databaseSistema = 'connected';
  } catch {
    health.checks.databaseSistema = 'unavailable';
    health.ok = false;
  }

  try {
    await queryDb('SELECT 1', [], true);
    health.checks.databaseVectorial = 'connected';
  } catch {
    health.checks.databaseVectorial = 'unavailable';
    health.ok = false;
  }

  res.status(health.ok ? 200 : 503).json(health);
});

// ==================== AUTENTICACIÓN (Sin requerir token) ====================
app.post('/api/auth/register', registerController);
app.post('/api/auth/login', loginController);
app.post('/api/auth/forgot-password', forgotPasswordController);
app.post('/api/auth/reset-password', resetPasswordController);
app.get('/api/auth/reset-password/validate', validateResetTokenController);
app.post('/api/auth/logout', authGuard, logoutController);

// ==================== PERFIL DE USUARIO (Requiere autenticación) ====================
app.get('/api/users/profile', authGuard, getProfileController);
app.patch('/api/users/profile', authGuard, updateProfileController);
app.post('/api/users/change-password', authGuard, userChangePasswordController);

// ==================== ADMIN: GESTIÓN DE USUARIOS ====================
app.get('/api/admin/users', authGuard, adminGuard, getAllUsersController);
app.get('/api/admin/users/estadisticas', authGuard, adminGuard, getUserStatisticsController);
app.get('/api/admin/users/:id', authGuard, adminGuard, getUserByIdController);
app.patch('/api/admin/users/:id', authGuard, adminGuard, updateUserController);
app.delete('/api/admin/users/:id', authGuard, adminGuard, deactivateUserController);

// ==================== NORMATIVA (Admin) ====================
app.post('/api/normativa', authGuard, adminGuard, upload.single('file'), uploadNormativaController);
app.post('/api/normativa/:id/version', authGuard, adminGuard, upload.single('file'), uploadVersionNormativaController);
app.get('/api/normativa', authGuard, getNormativasController);
app.get('/api/normativa/:id', authGuard, getNormativaController);
app.patch('/api/normativa/:id', authGuard, adminGuard, updateNormativaController);
app.patch('/api/normativa/:id/estado', authGuard, adminGuard, changeStatusController);
app.post('/api/normativa/:id/activar', authGuard, adminGuard, activateNormativaController);
app.post('/api/normativa/:id/desactivar', authGuard, adminGuard, deactivateNormativaController);
app.get('/api/admin/normativa/estadisticas', authGuard, adminGuard, getNormativaStatisticsController);

// ==================== PROCESAMIENTO DE DOCUMENTOS ====================
app.post('/api/admin/normativa/:id/procesar', authGuard, adminGuard, (req, res) =>
  processingController.procesarNormativa(req, res)
);
app.post('/api/admin/normativa/:id/reintentar', authGuard, adminGuard, (req, res) =>
  processingController.reintentar(req, res)
);
app.get('/api/admin/procesamiento/:id/estado', authGuard, adminGuard, (req, res) =>
  processingController.obtenerEstado(req, res)
);
app.get('/api/admin/procesamiento', authGuard, adminGuard, (req, res) =>
  processingController.listarEnProceso(req, res)
);

// ==================== CONFIGURACIÓN DE IA (Solo admin) ====================
app.get('/api/ai-config', authGuard, adminGuard, getAIConfig);
app.put('/api/ai-config', authGuard, adminGuard, saveAIConfig);

// ==================== CHAT (Requiere autenticación) ====================
app.post('/api/chat/query', authGuard, postChatQuery);
app.get('/api/chat', authGuard, getChats);
app.get('/api/chat/:id', authGuard, getChat);

// ==================== LABORAL (Requiere autenticación) ====================
app.post('/api/laboral/documents', authGuard, createLaborDocument);
app.post('/api/laboral/calculations', authGuard, calculateBenefits);
app.get('/api/laboral/history', authGuard, getHistory);

// ==================== ERROR HANDLING ====================
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  if (err.message?.includes('File too large')) {
    res.status(413).json({
      success: false,
      message: 'El archivo excede el tamaño máximo permitido de 20 MB',
    });
    return;
  }

  if (err.message?.includes('Formato de archivo no válido')) {
    res.status(400).json({
      success: false,
      message: 'Formato de archivo no válido. Solo se permiten archivos PDF',
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
  });
});

// ==================== 404 ====================
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
  });
});

// ==================== INICIAR SERVIDOR ====================
const startServer = async (): Promise<void> => {
  validateRuntimeConfig();
  await AuthService.ensureDemoAdmin();
  app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📚 Documentación: ${config.server.frontendUrl}`);
  });
};

void startServer().catch((error) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});
