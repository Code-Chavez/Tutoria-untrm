import { prisma } from '../../src/infrastructure/database/prisma';
import { requestContext } from '../../src/infrastructure/context/requestContext';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { LastActiveAdministratorError } from '../../src/application/use-cases/users/UserErrors';
import { ToggleUserStatusUseCase } from '../../src/application/use-cases/users/ToggleUserStatusUseCase';
import { removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * LEV-R02 / C-3: nunca se puede dejar al sistema sin una cuenta de administración activa, ni desactivando ni cambiando de rol, sobre
 * uno mismo o sobre otro, y tampoco con dos solicitudes simultáneas. Contra la base real de pruebas.
 *
 * Datos PROPIOS: un rol de administración y otro rol de prueba, con cuentas propias. El repositorio se construye con ese rol como
 * «rol de administración», así que no se cuenta ni se toca ninguna cuenta real (las administradoras sembradas no intervienen).
 * Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const stamp = String(Date.now());
const ADMIN_ROLE = `Rol Admin Prueba ${stamp}`;
const OTHER_ROLE = `Rol Otro Prueba ${stamp}`;

describe('protección de la última cuenta de administración activa', () => {
  let dbUp = false;
  let adminRoleId = '';
  let otherRoleId = '';
  let hash = '';
  let actorId = '';
  let a = '';
  let b = '';
  const ownUserIds: string[] = [];
  const repo = () => new PrismaUserRepository(prisma, ADMIN_ROLE);
  let n = 0;

  const newUser = async (roleId: string) => {
    n += 1;
    const user = await prisma.user.create({
      data: { email: `adm-prueba-${stamp}-${n}@untrm.edu.pe`, passwordHash: hash, firstName: 'Prueba', lastName: `Admin ${n}`, roleId, isActive: false },
    });
    ownUserIds.push(user.id);
    return user.id;
  };
  const state = async (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: { isActive: true, roleId: true } });
  const activeAdmins = () => prisma.user.count({ where: { roleId: adminRoleId, isActive: true } });
  /** Deja las dos cuentas de administración propias en el estado indicado; el resto de las cuentas propias, sin rol de administración. */
  const setAdmins = async (activeA: boolean | null, activeB: boolean | null) => {
    await prisma.user.updateMany({ where: { id: { in: ownUserIds } }, data: { isActive: false, roleId: otherRoleId } });
    if (activeA !== null) await prisma.user.update({ where: { id: a }, data: { roleId: adminRoleId, isActive: activeA } });
    if (activeB !== null) await prisma.user.update({ where: { id: b }, data: { roleId: adminRoleId, isActive: activeB } });
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de la última cuenta de administración.');
      return;
    }
    hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    adminRoleId = (await prisma.role.create({ data: { name: ADMIN_ROLE, description: 'prueba' } })).id;
    otherRoleId = (await prisma.role.create({ data: { name: OTHER_ROLE, description: 'prueba' } })).id;
    actorId = await newUser(otherRoleId);
    a = await newUser(otherRoleId);
    b = await newUser(otherRoleId);
  });

  afterAll(async () => {
    if (dbUp) {
      await removeOwnUserTraces(prisma, ownUserIds, ownUserIds);
      await prisma.user.deleteMany({ where: { id: { in: ownUserIds } } });
      await prisma.role.deleteMany({ where: { id: { in: [adminRoleId, otherRoleId].filter(Boolean) } } });
    }
    await prisma.$disconnect();
  });

  it('el último administrador activo no se puede desactivar: error claro y nada cambia', async () => {
    if (!dbUp) return;
    await setAdmins(true, null);

    await expect(repo().update(a, { isActive: false })).rejects.toBeInstanceOf(LastActiveAdministratorError);
    await expect(repo().update(a, { isActive: false })).rejects.toThrow(/última cuenta de administración activa/);

    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
  });

  it('al último administrador activo no se le puede cambiar el rol: nada cambia', async () => {
    if (!dbUp) return;
    await setAdmins(true, null);

    await expect(repo().update(a, { roleId: otherRoleId })).rejects.toBeInstanceOf(LastActiveAdministratorError);
    await expect(repo().update(a, { roleId: otherRoleId, isActive: false })).rejects.toBeInstanceOf(LastActiveAdministratorError);

    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
  });

  it('el caso de uso de desactivar rechaza al último administrador (la regla es del servidor, sea sobre sí mismo o sobre otro)', async () => {
    if (!dbUp) return;
    await setAdmins(true, null);

    await expect(new ToggleUserStatusUseCase(repo()).execute(a)).rejects.toBeInstanceOf(LastActiveAdministratorError);

    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
  });

  it('con otro administrador activo se puede desactivar o cambiar de rol a uno (no se exigen dos permanentes)', async () => {
    if (!dbUp) return;
    await setAdmins(true, true);
    await repo().update(a, { isActive: false });
    expect(await state(a)).toMatchObject({ isActive: false });
    expect(await activeAdmins()).toBe(1);

    await setAdmins(true, true);
    await repo().update(b, { roleId: otherRoleId });
    expect(await state(b)).toMatchObject({ roleId: otherRoleId });
    expect(await activeAdmins()).toBe(1);
  });

  it('si el otro administrador está desactivado, el activo es el último y no se puede quitar', async () => {
    if (!dbUp) return;
    await setAdmins(true, false);

    await expect(repo().update(a, { isActive: false })).rejects.toBeInstanceOf(LastActiveAdministratorError);

    expect(await state(a)).toEqual({ isActive: true, roleId: adminRoleId });
    expect(await activeAdmins()).toBe(1);
  });

  it('activar una cuenta o pasarla a administrador nunca se bloquea, ni desactivar a quien no es administrador', async () => {
    if (!dbUp) return;
    await setAdmins(true, false);
    await repo().update(b, { isActive: true });
    expect(await activeAdmins()).toBe(2);

    await setAdmins(null, null);
    await repo().update(a, { roleId: adminRoleId, isActive: true });
    expect(await activeAdmins()).toBe(1);

    // Quien no es administrador se desactiva aunque no quede ninguna cuenta de administración activa: no la está quitando.
    await setAdmins(null, null);
    await prisma.user.update({ where: { id: b }, data: { isActive: true } });
    await repo().update(b, { isActive: false });
    expect(await state(b)).toMatchObject({ isActive: false });
  });

  it('los cambios que no tocan el estado ni el rol (p. ej. el nombre) no se ven afectados', async () => {
    if (!dbUp) return;
    await setAdmins(true, null);

    await repo().update(a, { firstName: 'Otro nombre' });

    expect((await prisma.user.findUniqueOrThrow({ where: { id: a } })).firstName).toBe('Otro nombre');
  });

  it('dos desactivaciones simultáneas que por separado serían válidas no dejan cero administradores', async () => {
    if (!dbUp) return;
    for (let round = 0; round < 8; round += 1) {
      await setAdmins(true, true);

      const results = await Promise.allSettled([repo().update(a, { isActive: false }), repo().update(b, { isActive: false })]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(LastActiveAdministratorError);
      expect(await activeAdmins()).toBe(1);
    }
  });

  it('una desactivación y un cambio de rol simultáneos tampoco dejan cero administradores', async () => {
    if (!dbUp) return;
    for (let round = 0; round < 8; round += 1) {
      await setAdmins(true, true);

      const results = await Promise.allSettled([repo().update(a, { isActive: false }), repo().update(b, { roleId: otherRoleId })]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await activeAdmins()).toBe(1);
    }
  });

  it('una operación exitosa conserva su auditoría (autor y cambio); la rechazada no deja registro', async () => {
    if (!dbUp) return;
    await setAdmins(true, true);
    await prisma.auditLog.deleteMany({ where: { entity: 'User', entityId: { in: [a, b] } } });

    await requestContext.run({ userId: actorId, ipAddress: '10.0.0.9' }, () => repo().update(a, { isActive: false }));
    await expect(requestContext.run({ userId: actorId }, () => repo().update(b, { isActive: false }))).rejects.toBeInstanceOf(LastActiveAdministratorError);

    const entries = await prisma.auditLog.findMany({ where: { entity: 'User', entityId: { in: [a, b] } } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ userId: actorId, action: 'UPDATE', entityId: a, details: 'isActive', ipAddress: '10.0.0.9' });
  });
});
