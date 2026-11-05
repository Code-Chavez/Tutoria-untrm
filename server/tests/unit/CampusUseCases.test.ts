import {
  CampusNotFoundError,
  CreateCampusUseCase,
  InvalidCampusError,
  ListCampusesUseCase,
  SchoolNotFoundForCampusError,
  SetSchoolCampusUseCase,
  UpdateCampusUseCase,
} from '@application/use-cases/campuses/CampusUseCases';
import { CampusRepository } from '@domain/repositories/CampusRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

const campus = (over = {}) => ({ id: 'c1', name: 'Sede Bagua', isActive: true, createdAt: new Date(), ...over });
const school = { id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true, createdAt: new Date(), campusId: 'c0' };

describe('sedes (fase 3)', () => {
  let campuses: jest.Mocked<CampusRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    campuses = {
      findAll: jest.fn().mockResolvedValue([campus()]),
      findById: jest.fn().mockResolvedValue(campus()),
      create: jest.fn().mockImplementation(async (name: string) => campus({ name })),
      rename: jest.fn().mockImplementation(async (_id: string, name: string) => campus({ name })),
      setActive: jest.fn().mockImplementation(async (_id: string, isActive: boolean) => campus({ isActive })),
      setSchoolCampus: jest.fn().mockResolvedValue(undefined),
    };
    schools = { findAll: jest.fn().mockResolvedValue([school]), findById: jest.fn().mockResolvedValue(school) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
  });

  it('lista las sedes junto con las escuelas y la sede de cada una', async () => {
    const result = await new ListCampusesUseCase(campuses, schools).execute();

    expect(result.campuses).toHaveLength(1);
    expect(result.schools).toEqual([{ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', campusId: 'c0' }]);
  });

  it('crea una sede normalizando espacios y lo deja en la bitácora', async () => {
    const created = await new CreateCampusUseCase(campuses, audit).execute('vice', '  Sede   Condorcanqui ', '10.0.0.1');

    expect(created.name).toBe('Sede Condorcanqui');
    expect(audit.create.mock.calls[0][0]).toMatchObject({ userId: 'vice', action: 'CAMPUS_CREATED', ipAddress: '10.0.0.1' });
  });

  it.each(['', 'ab', 'x'.repeat(81)])('rechaza un nombre de sede inválido (%j)', async (name) => {
    await expect(new CreateCampusUseCase(campuses, audit).execute('vice', name)).rejects.toBeInstanceOf(InvalidCampusError);
    expect(campuses.create).not.toHaveBeenCalled();
  });

  it('renombra o desactiva una sede; sin cambios o sin sede se rechaza', async () => {
    const update = new UpdateCampusUseCase(campuses, audit);

    await update.execute('vice', 'c1', { name: 'Sede Bagua Grande' });
    await update.execute('vice', 'c1', { isActive: false });
    await expect(update.execute('vice', 'c1', {})).rejects.toBeInstanceOf(InvalidCampusError);
    campuses.findById.mockResolvedValue(null);
    await expect(update.execute('vice', 'x', { name: 'Otra sede' })).rejects.toBeInstanceOf(CampusNotFoundError);
  });

  describe('sede de una escuela', () => {
    const set = () => new SetSchoolCampusUseCase(schools, campuses, audit);

    it('fija la sede y deja constancia', async () => {
      await set().execute('vice', 's1', 'c1');

      expect(campuses.setSchoolCampus).toHaveBeenCalledWith('s1', 'c1');
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'SCHOOL_CAMPUS_SET', entityId: 's1' });
    });

    it('rechaza una escuela inexistente, y una sede inexistente o inactiva', async () => {
      schools.findById.mockResolvedValueOnce(null);
      await expect(set().execute('vice', 'x', 'c1')).rejects.toBeInstanceOf(SchoolNotFoundForCampusError);

      campuses.findById.mockResolvedValueOnce(campus({ isActive: false }));
      await expect(set().execute('vice', 's1', 'c1')).rejects.toBeInstanceOf(CampusNotFoundError);

      expect(campuses.setSchoolCampus).not.toHaveBeenCalled();
    });
  });
});
