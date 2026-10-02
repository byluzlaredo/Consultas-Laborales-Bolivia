import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const devSecret = 'dev-local-secret-change-me';
const devAdminPassword = 'ChangeMe123!';

export const config = {
  database: {
    sistema: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema',
    vectorial: process.env.DATABASE_VECTORIAL_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/db_vectorial',
  },
  server: {
    port: Number(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  jwt: {
    secret: process.env.JWT_SECRET || (isProduction ? '' : devSecret),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  resetTokenExpirySeconds: Number(process.env.RESET_TOKEN_EXPIRY) || 3600,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || process.env.SMTP_FROM || 'noreply@consulta.bo',
  },
  upload: {
    maxSize: Number(process.env.UPLOAD_MAX_SIZE) || 20 * 1024 * 1024,
    directory: process.env.PDF_DIRECTORY || 'src/PDF',
    storagePath: process.env.UPLOAD_STORAGE_PATH || 'uploads/',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@consulta.bo',
    password: process.env.ADMIN_PASSWORD || (isProduction ? '' : devAdminPassword),
  },
};

export const validateRuntimeConfig = (): void => {
  if (isProduction) {
    if (!config.jwt.secret || config.jwt.secret.trim().length < 32) {
      throw new Error('JWT_SECRET debe estar definido en producción');
    }
    if (!config.admin.password || config.admin.password.trim().length < 8) {
      throw new Error('ADMIN_PASSWORD debe estar definido en producción');
    }
  }
};
