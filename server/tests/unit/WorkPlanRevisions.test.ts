import { toPublicWorkPlan } from '@application/use-cases/work-plans/toPublicWorkPlan';
import {
  ListWorkPlanVersionsUseCase,
  GetWorkPlanVersionUseCase,
  GetWorkPlanVersionResolutionFileUseCase,
} from '@application/use-cases/work-plans/WorkPlanVersionUseCases';
import { WorkPlanForbiddenError, WorkPlanVersionNotFoundError } from '@application/use-cases/work-plans/WorkPlanErrors';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { WorkPlan, WorkPlanVersion } from '@domain/entities/WorkPlan';

const at = new Date('2026-09-01T10:00:00Z');
const plan = (extra: Partial<WorkPlan> = {}) =>
  ({
    id: 'wp1',
    schoolId: 's1',
    denomination: 'Contenido nuevo',
    revision: 1,
    lastApprovedRevision: null,
    resolutionFileName: null,
    resolutionFileSize: null,
    resolutionStorageKey: null,
    resolutionUploadedAt: null,
    updatedAt: at,
    ...extra,
  }) as WorkPlan;

describe('toPublicWorkPlan status (A12)', () => {
  it('un plan nunca aprobado es BORRADOR y no está vigente', () => {
    const p = toPublicWorkPlan(plan());
    expect(p.status).toBe('BORRADOR');
    expect(p.inForce).toBe(false);
  });

  it('un plan con resolución propia es APROBADO y vigente', () => {
    const p = toPublicWorkPlan(
      plan({ resolutionFileName: 'a.pdf', resolutionFileSize: 1, resolutionStorageKey: 'k', resolutionUploadedAt: at }),
    );
    expect(p.status).toBe('APROBADO');
    expect(p.inForce).toBe(true);
  });

  it('un plan editado tras aprobarse queda EN_REVISION: sin resolución propia, con la versión anterior vigente', () => {
    const p = toPublicWorkPlan(plan({ revision: 2, lastApprovedRevision: 1 }));
    expect(p.status).toBe('EN_REVISION');
    expect(p.resolution).toBeNull();
    expect(p.inForce).toBe(true);
  });
});

describe('Work plan version use cases (A12)', () => {
  const version = {
    id: 'v1',
    workPlanId: 'wp1',
    revision: 1,
    authorId: 'u1',
    content: { denomination: 'Contenido aprobado' },
    resolutionFileName: 'RD-1.pdf',
    resolutionFileSize: 10,
    resolutionStorageKey: 'key-1.pdf',
    resolutionUploadedAt: at,
    createdAt: at,
  } as unknown as WorkPlanVersion;

  const users = { findById: jest.fn().mockResolvedValue({ id: 'u1', roleId: 'r1' }) } as unknown as UserRepository;
  const roles = { findById: jest.fn().mockResolvedValue({ id: 'r1', name: 'Coordinador' }) } as unknown as RoleRepository;
  const schools = {
    findAll: jest.fn().mockResolvedValue([
      { id: 's1', name: 'Sistemas', coordinatorId: 'u1' },
      { id: 's2', name: 'Civil', coordinatorId: 'other' },
    ]),
  } as unknown as SchoolRepository;
  const periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as AcademicPeriodRepository;
  const workPlans = {
    findByPeriodAndSchool: jest.fn().mockResolvedValue(plan({ revision: 2, lastApprovedRevision: 1 })),
    findVersions: jest.fn().mockResolvedValue([version]),
    findVersion: jest.fn().mockImplementation(async (_id: string, r: number) => (r === 1 ? version : null)),
  } as unknown as WorkPlanRepository;
  const storage = { resolvePath: jest.fn().mockReturnValue('/data/key-1.pdf') } as unknown as EvidenceStorage;

  it('lista las versiones aprobadas con su resolución', async () => {
    const res = await new ListWorkPlanVersionsUseCase(users, roles, schools, periods, workPlans).execute('u1', 's1');
    expect(res).toEqual([{ revision: 1, approvedAt: at, resolution: { fileName: 'RD-1.pdf', fileSize: 10 } }]);
  });

  it('la versión exportada muestra el contenido aprobado, no el borrador actual', async () => {
    const view = await new GetWorkPlanVersionUseCase(users, roles, schools, periods, workPlans).execute('u1', 's1', 1);
    expect(view.plan?.denomination).toBe('Contenido aprobado');
    expect(view.plan?.status).toBe('APROBADO');
    expect(view.plan?.revision).toBe(1);
  });

  it('entrega la resolución de la versión archivada', async () => {
    const file = await new GetWorkPlanVersionResolutionFileUseCase(users, roles, schools, periods, workPlans, storage).execute('u1', 's1', 1);
    expect(file).toEqual({ fileName: 'RD-1.pdf', absolutePath: '/data/key-1.pdf' });
  });

  it('rechaza una revisión inexistente y escuelas ajenas', async () => {
    const get = new GetWorkPlanVersionUseCase(users, roles, schools, periods, workPlans);
    await expect(get.execute('u1', 's1', 9)).rejects.toBeInstanceOf(WorkPlanVersionNotFoundError);
    await expect(get.execute('u1', 's2', 1)).rejects.toBeInstanceOf(WorkPlanForbiddenError);
  });
});
