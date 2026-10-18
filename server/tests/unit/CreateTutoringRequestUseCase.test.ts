import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import {
  InstructorDetailsRequiredError,
  NoRoutingTargetError,
} from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { TutoringRequestRepository } from '@domain/repositories/TutoringRequestRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Student } from '@domain/entities/Student';
import { School } from '@domain/entities/School';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';
import { CreateTutoringRequestInput } from '@application/dtos/tutoringRequest.dto';
import { allowAllGuard } from '../helpers/studentGuard';

describe('CreateTutoringRequestUseCase', () => {
  let useCase: CreateTutoringRequestUseCase;
  let requests: jest.Mocked<TutoringRequestRepository>;
  let students: jest.Mocked<StudentRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let notifications: jest.Mocked<NotificationRepository>;

  const baseInput: CreateTutoringRequestInput = {
    source: 'STUDENT',
    caseType: 'ACADEMIC',
    reason: 'Dificultad en el curso de Cálculo',
  };

  const school = { id: 'school-1', coordinatorId: 'coord-1' } as School;

  beforeEach(() => {
    requests = {
      create: jest.fn().mockImplementation(async (data) => ({ id: 'req-1', createdAt: new Date(), ...data })),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByStudent: jest.fn(),
      updateAttention: jest.fn(),
      attachFollowUp: jest.fn(),
    };
    students = {
      findById: jest.fn().mockResolvedValue({ id: 'student-1', tutorId: 'tutor-1', schoolId: 'school-1' } as Student),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    schools = { findAll: jest.fn(), findById: jest.fn().mockResolvedValue(school) };
    users = {
      findById: jest.fn().mockResolvedValue({ id: 'tutor-1', isActive: true } as User), // el tutor asignado, activo
      findByEmail: jest.fn(),
      findAll: jest.fn().mockResolvedValue([{ id: 'dbu-1' } as User]),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn().mockResolvedValue({ id: 'role-dbu', name: 'Administrador DBU' } as Role),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    notifications = { create: jest.fn(), findByUser: jest.fn(), markRead: jest.fn() } as unknown as jest.Mocked<NotificationRepository>;
    useCase = new CreateTutoringRequestUseCase(requests, allowAllGuard(students), schools, users, roles, notifications);
  });

  it('avisa a quien recibe la solicitud, salvo que la haya registrado esa misma persona (R01)', async () => {
    await useCase.execute('student-1', 'user-actor', baseInput);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'tutor-1', type: 'TUTORING_REQUEST_CREATED', tutoringRequestId: expect.anything() }),
    );

    notifications.create.mockClear();
    await useCase.execute('student-1', 'tutor-1', baseInput);
    expect(notifications.create).not.toHaveBeenCalled();
  });

  describe('constancia para el tutorado', () => {
    it('si el tutorado tiene cuenta, recibe un aviso de que su solicitud quedó registrada (por él o por su tutor)', async () => {
      students.findById.mockResolvedValue({ id: 'student-1', tutorId: 'tutor-1', schoolId: 'school-1', userId: 'user-student' } as Student);

      // La registra el tutor a su nombre: el tutor no se avisa a sí mismo, pero el tutorado sí recibe constancia.
      await useCase.execute('student-1', 'tutor-1', baseInput);
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-student', type: 'TUTORING_REQUEST_RECEIVED', message: 'Se registró una solicitud de tutoría a tu nombre' }),
      );

      // La registra el propio tutorado: el tutor es avisado y el tutorado recibe su acuse.
      notifications.create.mockClear();
      const student = { id: 'student-1', tutorId: 'tutor-1', schoolId: 'school-1', userId: 'user-student' } as Student;
      await useCase.registerFor(student, 'user-student', baseInput);
      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'tutor-1', type: 'TUTORING_REQUEST_CREATED' }));
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-student', type: 'TUTORING_REQUEST_RECEIVED', message: expect.stringContaining('Recibimos tu solicitud') }),
      );
    });

    it('si el tutorado no tiene cuenta vinculada, no hay a quién avisar', async () => {
      await useCase.execute('student-1', 'user-actor', baseInput);
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'TUTORING_REQUEST_RECEIVED' }));
    });
  });

  it('enruta al tutor cuando el estudiante ya tiene uno asignado', async () => {
    const result = await useCase.execute('student-1', 'user-actor', baseInput);

    expect(result.routedToId).toBe('tutor-1');
    expect(result.routedToRole).toBe('tutor');
    expect(schools.findById).not.toHaveBeenCalled();
  });

  it('enruta al coordinador de la escuela cuando no hay tutor asignado', async () => {
    students.findById.mockResolvedValue({ id: 'student-1', tutorId: null, schoolId: 'school-1' } as Student);

    const result = await useCase.execute('student-1', 'user-actor', baseInput);

    expect(result.routedToId).toBe('coord-1');
    expect(result.routedToRole).toBe('coordinator');
  });

  it('usa un Administrador DBU como respaldo si la escuela no tiene coordinador', async () => {
    students.findById.mockResolvedValue({ id: 'student-1', tutorId: null, schoolId: 'school-1' } as Student);
    schools.findById.mockResolvedValue({ id: 'school-1', coordinatorId: null } as School);

    const result = await useCase.execute('student-1', 'user-actor', baseInput);

    expect(result.routedToId).toBe('dbu-1');
    expect(result.routedToRole).toBe('coordinator');
  });

  it('lanza NoRoutingTargetError si no hay coordinador ni DBU disponible', async () => {
    students.findById.mockResolvedValue({ id: 'student-1', tutorId: null, schoolId: 'school-1' } as Student);
    schools.findById.mockResolvedValue({ id: 'school-1', coordinatorId: null } as School);
    users.findAll.mockResolvedValue([]);

    await expect(useCase.execute('student-1', 'user-actor', baseInput)).rejects.toThrow(
      NoRoutingTargetError,
    );
  });

  it('exige nombre de docente y curso cuando el origen es un docente de asignatura', async () => {
    await expect(
      useCase.execute('student-1', 'user-actor', { ...baseInput, source: 'INSTRUCTOR' }),
    ).rejects.toThrow(InstructorDetailsRequiredError);
    expect(requests.create).not.toHaveBeenCalled();
  });

  it('registra los datos del docente cuando el origen es INSTRUCTOR', async () => {
    const result = await useCase.execute('student-1', 'user-actor', {
      ...baseInput,
      source: 'INSTRUCTOR',
      instructorName: 'Prof. Juan Pérez',
      courseName: 'Cálculo I',
    });

    expect(result.instructorName).toBe('Prof. Juan Pérez');
    expect(result.courseName).toBe('Cálculo I');
  });

  it('lanza StudentNotFoundError si el estudiante no existe', async () => {
    students.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'user-actor', baseInput)).rejects.toThrow(
      StudentNotFoundError,
    );
  });
});
