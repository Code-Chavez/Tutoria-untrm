import { ListWorkPlansUseCase } from '@application/use-cases/work-plans/ListWorkPlansUseCase';
import { GetWorkPlanUseCase } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { SaveWorkPlanUseCase } from '@application/use-cases/work-plans/SaveWorkPlanUseCase';
import { WorkPlanForbiddenError } from '@application/use-cases/work-plans/WorkPlanErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { WorkPlanRepository } from '@domain/repositories/WorkPlanRepository';
import { WorkPlan, WorkPlanContent } from '@domain/entities/WorkPlan';

const content = { denomination: 'Taller de inducción' } as WorkPlanContent;

describe('Work plan use cases (HU-41)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let workPlans: jest.Mocked<WorkPlanRepository>;
  let roleName: string;

  beforeEach(() => {
    roleName = 'Coordinador';
    users = {
      findById: jest.fn().mockResolvedValue({ id: 'u1', roleId: 'r1' }),
    } as unknown as jest.Mocked<UserRepository>;
    roles = {
      findById: jest.fn().mockImplementation(async () => ({ id: 'r1', name: roleName })),
    } as unknown as jest.Mocked<RoleRepository>;
    schools = {
      findAll: jest.fn().mockResolvedValue([
        { id: 's1', name: 'Sistemas', coordinatorId: 'u1' },
        { id: 's2', name: 'Civil', coordinatorId: 'other' },
      ]),
    } as unknown as jest.Mocked<SchoolRepository>;
    periods = {
      findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }),
    } as unknown as jest.Mocked<AcademicPeriodRepository>;
    workPlans = {
      findByPeriodAndSchool: jest.fn().mockResolvedValue(null),
      findAllByPeriod: jest.fn().mockResolvedValue([{ schoolId: 's1' } as WorkPlan]),
      upsert: jest.fn().mockResolvedValue({ id: 'wp1' } as WorkPlan),
    };
  });

  const list = () => new ListWorkPlansUseCase(users, roles, schools, periods, workPlans);
  const get = () => new GetWorkPlanUseCase(users, roles, schools, periods, workPlans);
  const save = () => new SaveWorkPlanUseCase(users, roles, schools, periods, workPlans);

  it('el Coordinador solo ve sus escuelas y si ya tienen plan', async () => {
    const res = await list().execute('u1');
    expect(res.schools).toEqual([{ schoolId: 's1', schoolName: 'Sistemas', hasPlan: true }]);
  });

  it('la DBU ve todas las escuelas', async () => {
    roleName = 'Administrador DBU';
    const res = await list().execute('u1');
    expect(res.schools.map((s) => s.schoolId)).toEqual(['s1', 's2']);
    expect(res.schools[1].hasPlan).toBe(false);
  });

  it('otros roles no tienen acceso', async () => {
    roleName = 'Docente Tutor';
    await expect(list().execute('u1')).rejects.toBeInstanceOf(WorkPlanForbiddenError);
  });

  it('rechaza la escuela de otro coordinador', async () => {
    await expect(get().execute('u1', 's2')).rejects.toBeInstanceOf(WorkPlanForbiddenError);
    await expect(save().execute('u1', 's2', content)).rejects.toBeInstanceOf(WorkPlanForbiddenError);
    expect(workPlans.upsert).not.toHaveBeenCalled();
  });

  it('get devuelve null cuando aún no hay plan', async () => {
    const view = await get().execute('u1', 's1');
    expect(view).toEqual({ periodName: '2026-II', schoolName: 'Sistemas', plan: null });
  });

  it('exige periodo activo', async () => {
    periods.findActive.mockResolvedValue(null);
    await expect(get().execute('u1', 's1')).rejects.toBeInstanceOf(NoActivePeriodError);
    await expect(save().execute('u1', 's1', content)).rejects.toBeInstanceOf(NoActivePeriodError);
  });

  it('save hace upsert en el periodo activo con el autor', async () => {
    await save().execute('u1', 's1', content);
    expect(workPlans.upsert).toHaveBeenCalledWith('p1', 's1', 'u1', content);
  });
});
