import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedBase } from './seedBase';

export class WeakAdminPasswordError extends Error {
  constructor(reason: string) {
    super(`ADMIN_PASSWORD no es aceptable: ${reason}`);
    this.name = 'WeakAdminPasswordError';
  }
}

const KNOWN_DEFAULTS = ['Admin2026!', 'Demo2026!', 'admin', 'password', 'changeme'];

export function assertAcceptableAdminPassword(password: string): void {
  if (password.length < 12) throw new WeakAdminPasswordError('debe tener al menos 12 caracteres');
  if (KNOWN_DEFAULTS.some((d) => password.toLowerCase() === d.toLowerCase())) {
    throw new WeakAdminPasswordError('es una contraseña de ejemplo o de desarrollo');
  }
}

export interface BootstrapOptions {
  adminEmail: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
  bcryptRounds?: number;
}

/**
 * Arranque de una instalación nueva (A11): crea los datos base (permisos, roles, parámetros) y, solo si aún
 * no existe ningún Administrador DBU, el primero con las credenciales dadas. NO crea cuentas ni datos de
 * ejemplo. Es idempotente: al repetirlo no cambia la contraseña de un administrador existente.
 */
export async function bootstrap(prisma: PrismaClient, options: BootstrapOptions): Promise<{ createdAdmin: boolean }> {
  const { adminRole } = await seedBase(prisma);

  const existingAdmins = await prisma.user.count({ where: { roleId: adminRole.id } });
  if (existingAdmins > 0) return { createdAdmin: false };

  assertAcceptableAdminPassword(options.adminPassword);
  await prisma.user.create({
    data: {
      email: options.adminEmail.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(options.adminPassword, options.bcryptRounds ?? 12),
      firstName: options.adminFirstName ?? 'Administrador',
      lastName: options.adminLastName ?? 'DBU',
      roleId: adminRole.id,
    },
  });
  return { createdAdmin: true };
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const prisma = new PrismaClient();
  try {
    const { adminRole } = await seedBase(prisma);
    const hasAdmin = (await prisma.user.count({ where: { roleId: adminRole.id } })) > 0;
    if (!hasAdmin && (!email || !password)) {
      console.error('Instalación nueva: defina ADMIN_EMAIL y ADMIN_PASSWORD para crear el primer administrador.');
      process.exit(1);
    }
    const result = await bootstrap(prisma, {
      adminEmail: email ?? '',
      adminPassword: password ?? '',
      adminFirstName: process.env.ADMIN_FIRST_NAME,
      adminLastName: process.env.ADMIN_LAST_NAME,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    });
    console.log(result.createdAdmin ? 'Bootstrap: datos base y primer administrador creados' : 'Bootstrap: datos base al día');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
