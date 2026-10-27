import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaRoleRepository } from '../../src/infrastructure/repositories/PrismaRoleRepository';

/**
 * LEV-R01: el rol y su registro de bitácora se guardan en una sola transacción, contra la base real de pruebas. Si la bitácora
 * falla (aquí, con un autor que no existe), no debe quedar el rol creado. Usa nombres propios y borra lo que crea. Se omite sin
 * base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(60_000);

const stamp = String(Date.now());
const OK_ROLE = `Rol Prueba Auditoria ${stamp}`;
const FAIL_ROLE = `Rol Prueba Sin Autor ${stamp}`;
const NO_USER = '00000000-0000-4000-8000-000000000000';

describe('creación de un rol y su bitácora (atomicidad)', () => {
  let dbUp = false;
  let adminId = '';
  const repo = new PrismaRoleRepository(prisma);

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de creación de roles.');
      return;
    }
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      const roles = await prisma.role.findMany({ where: { name: { in: [OK_ROLE, FAIL_ROLE] } } });
      await prisma.auditLog.deleteMany({ where: { entity: 'Role', entityId: { in: roles.map((r) => r.id) } } });
      await prisma.role.deleteMany({ where: { name: { in: [OK_ROLE, FAIL_ROLE] } } });
    }
    await prisma.$disconnect();
  });

  it('guarda el rol y su registro con autor, acción, rol e IP', async () => {
    if (!dbUp) return;
    const role = await repo.create({ name: OK_ROLE, description: 'prueba' }, { userId: adminId, ipAddress: '10.0.0.5' });

    const entries = await prisma.auditLog.findMany({ where: { entity: 'Role', entityId: role.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ userId: adminId, action: 'ROLE_CREATED', details: `Rol «${OK_ROLE}»`, ipAddress: '10.0.0.5' });
  });

  it('si la bitácora falla, no queda el rol', async () => {
    if (!dbUp) return;
    await expect(repo.create({ name: FAIL_ROLE, description: 'prueba' }, { userId: NO_USER, ipAddress: null })).rejects.toThrow();

    expect(await prisma.role.findUnique({ where: { name: FAIL_ROLE } })).toBeNull();
  });

  it('sin datos de bitácora crea solo el rol (uso existente, p. ej. la seed)', async () => {
    if (!dbUp) return;
    const name = `${OK_ROLE} sin bitacora`;
    const role = await repo.create({ name, description: 'prueba' });
    try {
      expect(await prisma.auditLog.count({ where: { entity: 'Role', entityId: role.id } })).toBe(0);
    } finally {
      await prisma.role.delete({ where: { id: role.id } });
    }
  });
});
