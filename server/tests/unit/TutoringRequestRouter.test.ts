import { TutoringRequestRouter } from '@application/use-cases/tutoring-requests/TutoringRequestRouter';
import { GetOwnRequestRecipientUseCase } from '@application/use-cases/tutoring-requests/GetOwnRequestRecipientUseCase';
import { NoRoutingTargetError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

// U02: a quién llega una solicitud, con una sola regla para enrutarla y para decírselo al estudiante antes de enviarla.
describe('a quién llega una solicitud de tutoría', () => {
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let router: TutoringRequestRouter;

  beforeEach(() => {
    schools = { findById: jest.fn().mockResolvedValue({ id: 'sch', coordinatorId: 'coord-1' }) } as unknown as jest.Mocked<SchoolRepository>;
    users = {
      findById: jest.fn().mockImplementation(async (id: string) => ({ id, firstName: id === 'tutor-1' ? 'Elena' : id === 'coord-1' ? 'Rosa' : 'Dora', lastName: 'Apellido' })),
      findAll: jest.fn().mockResolvedValue([{ id: 'dbu-1' }]),
    } as unknown as jest.Mocked<UserRepository>;
    roles = { findByName: jest.fn().mockResolvedValue({ id: 'r-dbu' }) } as unknown as jest.Mocked<RoleRepository>;
    router = new TutoringRequestRouter(schools, users, roles);
  });

  it('con tutor asignado, llega a su tutor', async () => {
    expect(await router.resolve('tutor-1', 'sch')).toEqual({ routedToId: 'tutor-1', routedToRole: 'tutor', kind: 'tutor' });
  });

  it('sin tutor, a la coordinación de su escuela', async () => {
    expect(await router.resolve(null, 'sch')).toEqual({ routedToId: 'coord-1', routedToRole: 'coordinator', kind: 'coordinator' });
  });

  it('sin tutor y sin coordinación, a un Administrador DBU activo (la solicitud nunca se pierde)', async () => {
    schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
    expect(await router.resolve(undefined, 'sch')).toEqual({ routedToId: 'dbu-1', routedToRole: 'coordinator', kind: 'dbu' });
    expect(users.findAll).toHaveBeenCalledWith({ isActive: true, roleId: 'r-dbu' });
  });

  it('si no hay a quién enrutar, lo dice (no se registra a ciegas)', async () => {
    schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
    users.findAll.mockResolvedValue([]);
    await expect(router.resolve(null, 'sch')).rejects.toBeInstanceOf(NoRoutingTargetError);
  });

  describe('consulta previa del estudiante', () => {
    let students: jest.Mocked<StudentRepository>;
    const useCase = () => new GetOwnRequestRecipientUseCase(students, users, router);

    it('dice quién la recibirá y de qué tipo, con el nombre', async () => {
      students = { findByUserId: jest.fn().mockResolvedValue({ id: 's1', tutorId: 'tutor-1', schoolId: 'sch' }) } as unknown as jest.Mocked<StudentRepository>;
      expect(await useCase().execute('u1')).toEqual({ kind: 'tutor', name: 'Elena Apellido' });

      students.findByUserId.mockResolvedValue({ id: 's1', tutorId: null, schoolId: 'sch' } as never);
      expect(await useCase().execute('u1')).toEqual({ kind: 'coordinator', name: 'Rosa Apellido' });
    });

    it('sin cuenta vinculada a un estudiante, o sin a quién enrutar, devuelve null en vez de fallar', async () => {
      students = { findByUserId: jest.fn().mockResolvedValue(null) } as unknown as jest.Mocked<StudentRepository>;
      expect(await useCase().execute('u1')).toBeNull();

      students.findByUserId.mockResolvedValue({ id: 's1', tutorId: null, schoolId: 'sch' } as never);
      schools.findById.mockResolvedValue({ id: 'sch', coordinatorId: null } as never);
      users.findAll.mockResolvedValue([]);
      expect(await useCase().execute('u1')).toBeNull();
    });
  });
});
