import { UploadWorkPlanResolutionUseCase } from '@application/use-cases/work-plans/UploadWorkPlanResolutionUseCase';
import { GetWorkPlanResolutionFileUseCase } from '@application/use-cases/work-plans/GetWorkPlanResolutionFileUseCase';
import { ListWorkPlansUseCase } from '@application/use-cases/work-plans/ListWorkPlansUseCase';
import {
  WorkPlanForbiddenError,
  WorkPlanNotFoundError,
  WorkPlanResolutionNotFoundError,
} from '@application/use-cases/work-plans/WorkPlanErrors';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { WorkPlan } from '@domain/entities/WorkPlan';

const file = { fileBuffer: Buffer.from('pdf'), fileName: 'RD-123.pdf', fileSize: 3 };
const uploadedAt = new Date('2026-10-03');

describe('Work plan approval resolution (HU-42)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let workPlans: jest.Mocked<WorkPlanRepository>;
  let storage: jest.Mocked<EvidenceStorage>;
  let roleName: string;

  const plan = (extra: Partial<WorkPlan> = {}) =>
    ({
      id: 'wp1',
      schoolId: 's1',
      resolutionFileName: null,
      resolutionFileSize: null,
      resolutionStorageKey: null,
      resolutionUploadedAt: null,
      ...extra,
    }) as WorkPlan;

  beforeEach(() => {
    roleName = 'Coordinador';
    users = { findById: jest.fn().mockResolvedValue({ id: 'u1', roleId: 'r1' }) } as unknown as jest.Mocked<UserRepository>;
    roles = {
      findById: jest.fn().mockImplementation(async () => ({ id: 'r1', name: roleName })),
    } as unknown as jest.Mocked<RoleRepository>;
    schools = {
      findAll: jest.fn().mockResolvedValue([
        { id: 's1', name: 'Sistemas', coordinatorId: 'u1' },
        { id: 's2', name: 'Civil', coordinatorId: 'other' },
      ]),
    } as unknown as jest.Mocked<SchoolRepository>;
    periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as jest.Mocked<AcademicPeriodRepository>;
    workPlans = {
      findByPeriodAndSchool: jest.fn().mockResolvedValue(plan()),
      findAllByPeriod: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      setResolution: jest.fn().mockResolvedValue(
        plan({
          resolutionFileName: 'RD-123.pdf',
          resolutionFileSize: 3,
          resolutionStorageKey: 'key-1.pdf',
          resolutionUploadedAt: uploadedAt,
        }),
      ),
    };
    storage = {
      save: jest.fn().mockResolvedValue('key-1.pdf'),
      resolvePath: jest.fn().mockReturnValue('/data/key-1.pdf'),
      delete: jest.fn(),
    };
  });

  const upload = () => new UploadWorkPlanResolutionUseCase(users, roles, schools, periods, workPlans, storage);
  const download = () => new GetWorkPlanResolutionFileUseCase(users, roles, schools, periods, workPlans, storage);

  it('guarda el PDF, vincula la resolución y vuelve vigente al plan sin exponer la clave', async () => {
    const result = await upload().execute('u1', 's1', file);

    expect(storage.save).toHaveBeenCalledWith(file.fileBuffer, 'RD-123.pdf');
    expect(workPlans.setResolution).toHaveBeenCalledWith('wp1', {
      fileName: 'RD-123.pdf',
      fileSize: 3,
      storageKey: 'key-1.pdf',
    });
    expect(result.inForce).toBe(true);
    expect(result.resolution).toEqual({ fileName: 'RD-123.pdf', fileSize: 3, uploadedAt });
    expect(JSON.stringify(result)).not.toContain('key-1.pdf');
  });

  it('no permite adjuntar a la escuela de otro coordinador', async () => {
    await expect(upload().execute('u1', 's2', file)).rejects.toBeInstanceOf(WorkPlanForbiddenError);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('exige que el plan exista antes de adjuntar la resolución', async () => {
    workPlans.findByPeriodAndSchool.mockResolvedValue(null);
    await expect(upload().execute('u1', 's1', file)).rejects.toBeInstanceOf(WorkPlanNotFoundError);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('la descarga falla si el plan no tiene resolución', async () => {
    await expect(download().execute('u1', 's1')).rejects.toBeInstanceOf(WorkPlanResolutionNotFoundError);
  });

  it('la descarga devuelve el nombre original y la ruta en disco', async () => {
    workPlans.findByPeriodAndSchool.mockResolvedValue(
      plan({ resolutionFileName: 'RD-123.pdf', resolutionStorageKey: 'key-1.pdf' }),
    );
    await expect(download().execute('u1', 's1')).resolves.toEqual({
      fileName: 'RD-123.pdf',
      absolutePath: '/data/key-1.pdf',
    });
  });

  it('la descarga respeta el alcance por escuela', async () => {
    await expect(download().execute('u1', 's2')).rejects.toBeInstanceOf(WorkPlanForbiddenError);
  });

  it('el listado marca como vigente solo el plan con resolución', async () => {
    roleName = 'Administrador DBU';
    workPlans.findAllByPeriod.mockResolvedValue([
      plan({ schoolId: 's1', resolutionStorageKey: 'key-1.pdf' }),
      plan({ schoolId: 's2' }),
    ]);
    const res = await new ListWorkPlansUseCase(users, roles, schools, periods, workPlans).execute('u1');
    expect(res.schools.map((s) => [s.schoolId, s.hasPlan, s.inForce])).toEqual([
      ['s1', true, true],
      ['s2', true, false],
    ]);
  });
});
