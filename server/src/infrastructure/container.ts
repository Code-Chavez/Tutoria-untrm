import { prisma } from './database/prisma';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { PrismaRoleRepository } from './repositories/PrismaRoleRepository';
import { PrismaRefreshTokenRepository } from './repositories/PrismaRefreshTokenRepository';
import { PrismaAuditLogRepository } from './repositories/PrismaAuditLogRepository';
import { PrismaPasswordResetTokenRepository } from './repositories/PrismaPasswordResetTokenRepository';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';
import { JwtTokenService } from './services/JwtTokenService';
import { LoginUseCase } from '@application/use-cases/auth/LoginUseCase';
import { RequestPasswordResetUseCase } from '@application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@application/use-cases/auth/ResetPasswordUseCase';

// Composition root: única pieza que conoce todas las implementaciones.
// El dominio y la aplicación solo ven interfaces (puertos).

const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const auditLogRepository = new PrismaAuditLogRepository(prisma);
const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository(prisma);

const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();

const loginUseCase = new LoginUseCase(
  userRepository,
  roleRepository,
  refreshTokenRepository,
  auditLogRepository,
  passwordHasher,
  tokenService,
);

const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
  userRepository,
  passwordResetTokenRepository
);

const resetPasswordUseCase = new ResetPasswordUseCase(
  userRepository,
  passwordResetTokenRepository,
  passwordHasher
);

export const container = {
  repositories: {
    userRepository,
    roleRepository,
    refreshTokenRepository,
    auditLogRepository,
    passwordResetTokenRepository,
  },
  services: {
    passwordHasher,
    tokenService,
  },
  useCases: {
    loginUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
  },
} as const;
