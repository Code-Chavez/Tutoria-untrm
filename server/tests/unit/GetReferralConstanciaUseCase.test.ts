import { GetReferralConstanciaUseCase } from '@application/use-cases/referrals/GetReferralConstanciaUseCase';
import { ReferralForbiddenError, ReferralNotFoundError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { School } from '@domain/entities/School';

describe('GetReferralConstanciaUseCase', () => {
  let useCase: GetReferralConstanciaUseCase;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let students: jest.Mocked<StudentRepository>;
  let users: jest.Mocked<UserRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let roleName: string;
  let requester: Partial<User>;

  const referral: StudentReferral = {
    id: 'referral-1',
    studentId: 'student-1',
    referredById: 'tutor-1',
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING', 'MENTAL_HEALTH_ANXIOUS'],
    reason: 'Bajo rendimiento y señales de ansiedad',
    service: 'PSICOLOGIA',
    receivingInstance: 'Psicóloga Ana García',
    status: 'ENVIADO',
    createdAt: new Date('2026-09-25T10:00:00Z'),
  };

  const student = {
    id: 'student-1',
    studentCode: '20191234',
    firstName: 'Ana',
    lastName: 'Torres',
    cycle: 5,
    schoolId: 'school-1',
  } as Student;

  const tutor = { id: 'tutor-1', roleId: 'r-tutor', firstName: 'Elena', lastName: 'Ramírez' } as User;
  const school = { id: 'school-1', name: 'Ingeniería de Sistemas', facultyId: 'f1' } as School;

  beforeEach(() => {
    referrals = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(referral),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
    };
    students = {
      findById: jest.fn().mockResolvedValue(student),
      findByCode: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignTutor: jest.fn(),
      countByTutor: jest.fn(),
    };
    roleName = 'Docente Tutor';
    requester = tutor;
    roles = {
      findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })),
    } as unknown as jest.Mocked<RoleRepository>;
    users = {
      // El tutor emisor consta por id; cualquier otro id resuelve al solicitante de la prueba.
      findById: jest.fn().mockImplementation(async (id: string) => (id === 'tutor-1' ? tutor : { ...requester, id })),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    schools = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(school),
    };
    const faculties = { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'Facultad de Ingeniería' }]) } as unknown as FacultyRepository;
    useCase = new GetReferralConstanciaUseCase(referrals, students, users, schools, roles, faculties);
  });

  it('resuelve nombres y etiquetas de los aspectos marcados', async () => {
    const result = await useCase.execute('referral-1', 'tutor-1');

    expect(result.studentName).toBe('Ana Torres');
    expect(result.studentCode).toBe('20191234');
    expect(result.schoolName).toBe('Ingeniería de Sistemas');
    expect(result.referredByName).toBe('Elena Ramírez');
    // Filiación completa para el formato impreso (A14).
    expect(result.facultyName).toBe('Facultad de Ingeniería');
    expect(result.status).toBeDefined();
    expect(result).toHaveProperty('tutorName');
    expect(result).toHaveProperty('studentEmail');
    expect(result.service).toBe('PSICOLOGIA');
    expect(result.receivingInstance).toBe('Psicóloga Ana García');
    expect(result.aspects).toEqual([
      { category: 'Académicos', label: 'Está en riesgo de repetir algún curso' },
      {
        category: 'Salud mental',
        label: 'Se le observa o escucha nervioso/a o con elevados niveles de ansiedad',
      },
    ]);
  });

  it('lanza ReferralNotFoundError si la derivación no existe', async () => {
    referrals.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing', 'tutor-1')).rejects.toThrow(ReferralNotFoundError);
  });

  describe('autorización sobre el caso (Art. 9.a, 14.c)', () => {
    it('el tutor emisor, la DBU y el profesional del servicio destino obtienen la constancia', async () => {
      await expect(useCase.execute('referral-1', 'tutor-1')).resolves.toBeDefined();

      roleName = 'Administrador DBU';
      requester = { roleId: 'r' };
      await expect(useCase.execute('referral-1', 'dbu-1')).resolves.toBeDefined();

      roleName = 'Profesional de Servicio';
      requester = { roleId: 'r', service: 'PSICOLOGIA' };
      await expect(useCase.execute('referral-1', 'prof-1')).resolves.toBeDefined();
    });

    it('otro tutor, un profesional de otro servicio, el coordinador y el vicerrectorado reciben 403 aun con el ID correcto', async () => {
      roleName = 'Docente Tutor';
      requester = { roleId: 'r' };
      await expect(useCase.execute('referral-1', 'tutor-2')).rejects.toBeInstanceOf(ReferralForbiddenError);

      roleName = 'Profesional de Servicio';
      requester = { roleId: 'r', service: 'SALUD' };
      await expect(useCase.execute('referral-1', 'prof-2')).rejects.toBeInstanceOf(ReferralForbiddenError);

      roleName = 'Coordinador';
      await expect(useCase.execute('referral-1', 'coord-1')).rejects.toBeInstanceOf(ReferralForbiddenError);
      roleName = 'Vicerrectorado';
      await expect(useCase.execute('referral-1', 'vice-1')).rejects.toBeInstanceOf(ReferralForbiddenError);
    });

    it('una cuenta desactivada no obtiene la constancia ni siquiera siendo la emisora', async () => {
      users.findById.mockResolvedValue({ ...tutor, isActive: false } as User);
      await expect(useCase.execute('referral-1', 'tutor-1')).rejects.toBeInstanceOf(ReferralForbiddenError);
    });

    it('no revela datos del tutorado antes de autorizar', async () => {
      roleName = 'Docente Tutor';
      requester = { roleId: 'r' };
      await expect(useCase.execute('referral-1', 'tutor-2')).rejects.toBeInstanceOf(ReferralForbiddenError);
      expect(students.findById).not.toHaveBeenCalled();
    });
  });
});
