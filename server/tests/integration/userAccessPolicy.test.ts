import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaUserAccessPolicyRepository } from '../../src/infrastructure/repositories/PrismaUserAccessPolicyRepository';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { PrismaRoleRepository } from '../../src/infrastructure/repositories/PrismaRoleRepository';
import { PrismaSchoolRepository } from '../../src/infrastructure/repositories/PrismaSchoolRepository';
import { PrismaStudentRepository } from '../../src/infrastructure/repositories/PrismaStudentRepository';
import { StudentAccessGuard } from '../../src/application/access/StudentAccessGuard';

describe('Políticas de alcance persistidas (LEV-R12)', () => {
  const policyRepository = new PrismaUserAccessPolicyRepository(prisma);
  const repositories = [new PrismaUserRepository(prisma), new PrismaRoleRepository(prisma), new PrismaSchoolRepository(prisma), new PrismaStudentRepository(prisma)] as const;
  const guard = new StudentAccessGuard(...repositories, policyRepository);
  let userId = '';
  const roleIds: string[] = [];
  const facultyIds: string[] = [];
  const schoolIds: string[] = [];

  beforeAll(async () => {
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: 'students:read' } });
    for (let i = 0; i < 2; i++) {
      const role = await prisma.role.create({ data: { name: `scope-role-${randomUUID()}`, description: 'Alcance de prueba' } });
      roleIds.push(role.id);
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      const faculty = await prisma.faculty.create({ data: { name: `scope-faculty-${randomUUID()}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `scope-school-${randomUUID()}`, facultyId: faculty.id } });
      schoolIds.push(school.id);
    }
    const user = await prisma.user.create({ data: {
      email: `scope-${randomUUID()}@untrm.edu.pe`, passwordHash: 'not-a-login-hash', firstName: 'Prueba', lastName: 'Alcance', roleId: roleIds[0],
    } });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.userAccessPolicy.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
    await prisma.faculty.deleteMany({ where: { id: { in: facultyIds } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    if (!userId) return;
    await prisma.user.update({ where: { id: userId }, data: { roleId: roleIds[0], isActive: true } });
    await prisma.userAccessPolicy.deleteMany({ where: { userId } });
  });

  it('sin políticas, todas las cuentas anteriores conservan el alcance calculado antes de la migración', async () => {
    const legacy = new StudentAccessGuard(...repositories);
    const accounts = await prisma.user.findMany({ where: { accessPolicy: null } });
    expect(accounts.length).toBeGreaterThan(0);
    for (const account of accounts) expect(await guard.scopeFor(account.id)).toEqual(await legacy.scopeFor(account.id));
  });

  it('un rol nuevo sin alcance no obtiene acceso individual', async () => {
    expect(await guard.scopeFor(userId)).toEqual({ kind: 'NONE' });
  });

  it('recupera y aplica escuelas explícitas sin conceder otras escuelas', async () => {
    await prisma.userAccessPolicy.create({ data: { userId, roleId: roleIds[0], kind: 'SCHOOLS', schoolIds: [schoolIds[0]] } });
    expect(await guard.scopeFor(userId)).toEqual({ kind: 'SCHOOLS', schoolIds: [schoolIds[0]] });
  });

  it('resuelve una facultad a sus escuelas sin incluir otra facultad', async () => {
    await prisma.userAccessPolicy.create({ data: { userId, roleId: roleIds[0], kind: 'FACULTIES', facultyIds: [facultyIds[0]] } });
    expect(await guard.scopeFor(userId)).toEqual({ kind: 'SCHOOLS', schoolIds: [schoolIds[0]] });
  });

  it('cambiar de rol y volver no reactiva el alcance anterior', async () => {
    await prisma.userAccessPolicy.create({ data: { userId, roleId: roleIds[0], kind: 'INSTITUTION' } });
    expect(await guard.scopeFor(userId)).toEqual({ kind: 'ALL' });
    await prisma.user.update({ where: { id: userId }, data: { roleId: roleIds[1] } });
    expect(await policyRepository.findByUserId(userId)).toMatchObject({ roleId: roleIds[1], kind: 'NONE', revision: 1 });
    await prisma.user.update({ where: { id: userId }, data: { roleId: roleIds[0] } });
    expect(await guard.scopeFor(userId)).toEqual({ kind: 'NONE' });
    expect(await policyRepository.findByUserId(userId)).toMatchObject({ revision: 2 });
  });

  it.each([
    { kind: 'INVENTED' },
    { kind: 'SCHOOLS' },
    { kind: 'FACULTIES' },
    { kind: 'INSTITUTION', schoolIds: ['foreign-school'] },
    { kind: 'SERVICE', service: null },
    { kind: 'SERVICE', service: 'UNRECOGNIZED' },
  ])('la base rechaza políticas incoherentes: %j', async (invalid) => {
    await expect(prisma.userAccessPolicy.create({ data: { userId, roleId: roleIds[0], ...invalid } })).rejects.toThrow();
    expect(await policyRepository.findByUserId(userId)).toBeNull();
  });
});
