import { PrismaClient } from '@prisma/client';

/**
 * Cuentas PROPIAS de una corrida de pruebas de integración: así quien inicia sesión no es una cuenta de demostración compartida,
 * y las sesiones iniciadas y la bitácora que genera se identifican por su identificador y se borran sin tocar a nadie más
 * (a diferencia de acotar por hora, que no sería seguro si otra suite corre a la vez).
 * La cuenta nace con la clave de demostración, tomada de una cuenta sembrada; la seed siempre la crea.
 */
export const DEMO_PASSWORD = 'Demo2026!';

export async function ownUser(
  prisma: PrismaClient,
  data: { email: string; roleName: 'Coordinador' | 'Docente Tutor'; firstName: string; lastName: string; schoolId?: string },
): Promise<string> {
  const role = await prisma.role.findFirstOrThrow({ where: { name: data.roleName } });
  const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
  return (await prisma.user.create({ data: { email: data.email, passwordHash: hash, firstName: data.firstName, lastName: data.lastName, roleId: role.id, schoolId: data.schoolId } })).id;
}

/** Borra todo lo que las cuentas propias dejaron: sesiones iniciadas, avisos, restablecimientos y bitácora (por su identificador). */
export async function removeOwnUserTraces(prisma: PrismaClient, userIds: string[], entityIds: string[] = []): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: [...userIds, ...entityIds] } }] } });
}
