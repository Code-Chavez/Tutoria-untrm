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

import { CreateUserUseCase } from '@application/use-cases/users/CreateUserUseCase';
import { UpdateUserUseCase } from '@application/use-cases/users/UpdateUserUseCase';
import { ToggleUserStatusUseCase } from '@application/use-cases/users/ToggleUserStatusUseCase';
import { ListUsersUseCase } from '@application/use-cases/users/ListUsersUseCase';

const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const toggleUserStatusUseCase = new ToggleUserStatusUseCase(userRepository);
const listUsersUseCase = new ListUsersUseCase(userRepository);

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
    createUserUseCase,
    updateUserUseCase,
    toggleUserStatusUseCase,
    listUsersUseCase,
  },
} as const;
