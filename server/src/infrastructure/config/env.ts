import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://sit_user:sit_pass@localhost:5432/sit_db',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Carpeta donde se guardan las evidencias de sesión (HU-25), fuera del
  // repositorio de código.
  // Saltos de proxy inverso delante del servidor (0 = ninguno). Con proxy, la IP real de los registros y
  // de los límites de solicitudes sale de X-Forwarded-For; sin esto todas serían la IP del proxy.
  TRUST_PROXY: parseInt(process.env.TRUST_PROXY || '0', 10),
  EVIDENCE_STORAGE_DIR: process.env.EVIDENCE_STORAGE_DIR || 'storage/evidence',
  // URL pública del cliente: con ella se arman los enlaces de los correos.
  PUBLIC_APP_URL: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  // Correo saliente (recuperación de contraseña). Sin SMTP_HOST el envío falla de forma explícita.
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'SIT UNTRM <no-reply@untrm.edu.pe>',
  PASSWORD_RESET_TTL_MINUTES: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '60', 10),
} as const;
