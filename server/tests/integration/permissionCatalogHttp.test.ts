import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/infrastructure/database/prisma';
import { JwtTokenService } from '../../src/infrastructure/services/JwtTokenService';
import { PERMISSION_CATALOG } from '../../src/domain/permissionCatalog';

describe('Catálogo de permisos por HTTP con datos propios (LEV-R10)', () => {
  let server: Server | undefined;
  let baseUrl = '';
  const roleIds: string[] = [];
  const userIds: string[] = [];
  const tokens: string[] = [];

  beforeAll(async () => {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: 'admin:system' } });
    const tokenService = new JwtTokenService();
    for (const administrator of [true, false]) {
      const role = await prisma.role.create({ data: { name: `catalog-${randomUUID()}`, description: 'Prueba de catálogo' } });
      roleIds.push(role.id);
      if (administrator) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      const user = await prisma.user.create({ data: {
        email: `catalog-${randomUUID()}@untrm.edu.pe`, passwordHash: 'not-a-login-hash',
        firstName: 'Prueba', lastName: 'Catálogo', roleId: role.id,
      } });
      userIds.push(user.id);
      tokens.push(tokenService.generateAccessToken({ sub: user.id, email: user.email, role: role.name }));
    }
    const { default: app } = await import('../../src/app');
    const listening = app.listen(0, '127.0.0.1');
    server = listening;
    await new Promise<void>((resolve) => listening.once('listening', resolve));
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No se obtuvo el puerto de pruebas');
    baseUrl = `http://127.0.0.1:${address.port}/api/roles/permissions`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.$disconnect();
  });

  const get = (token?: string) => fetch(baseUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

  it('exige autenticación', async () => {
    expect((await get()).status).toBe(401);
  });

  it('rechaza una cuenta sin el permiso de administrar el sistema', async () => {
    expect((await get(tokens[1])).status).toBe(403);
  });

  it('permite consultar por permiso, aunque el rol no tenga nombre de administrador', async () => {
    const response = await get(tokens[0]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ permissions: PERMISSION_CATALOG });
  });

  it('el catálogo coincide con los códigos que inicializa la base', async () => {
    const rows = await prisma.permission.findMany({ select: { code: true } });
    expect(rows.map((row) => row.code).sort()).toEqual(PERMISSION_CATALOG.map((permission) => permission.code).sort());
  });

  it('desactivar la cuenta revoca el acceso aun con un token vigente', async () => {
    await prisma.user.update({ where: { id: userIds[0] }, data: { isActive: false } });
    expect((await get(tokens[0])).status).toBe(401);
  });
});
