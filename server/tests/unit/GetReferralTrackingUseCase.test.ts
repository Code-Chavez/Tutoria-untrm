import { GetReferralTrackingUseCase } from '@application/use-cases/referrals/GetReferralTrackingUseCase';
import { ReferralForbiddenError } from '@application/use-cases/referrals/ReferralErrors';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe('GetReferralTrackingUseCase', () => {
  let referrals: jest.Mocked<StudentReferralRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let systemParameters: jest.Mocked<SystemParameterRepository>;
  let useCase: GetReferralTrackingUseCase;

  const overdueReferral: StudentReferral = {
    id: 'ref-overdue',
    studentId: 'stu-1',
    referredById: 'tutor-1',
    checkedAspects: [],
    reason: 'Motivo 1',
    service: 'PSICOLOGIA',
    receivingInstance: null,
    status: 'ENVIADO',
    statusHistory: [],
    createdAt: hoursAgo(72),
  };

  const onTimeReferral: StudentReferral = {
    id: 'ref-on-time',
    studentId: 'stu-2',
    referredById: 'tutor-1',
    checkedAspects: [],
    reason: 'Motivo 2',
    service: 'SALUD',
    receivingInstance: null,
    status: 'RECIBIDO',
    statusHistory: [
      {
        id: 'h1',
        referralId: 'ref-on-time',
        status: 'RECIBIDO',
        notes: null,
        changedById: 'prof-1',
        createdAt: hoursAgo(2),
      },
    ],
    createdAt: hoursAgo(20),
  };

  const closedReferral: StudentReferral = {
    id: 'ref-closed',
    studentId: 'stu-3',
    referredById: 'tutor-1',
    checkedAspects: [],
    reason: 'Motivo 3',
    service: 'PSICOLOGIA',
    receivingInstance: null,
    status: 'CERRADO',
    statusHistory: [
      {
        id: 'h2',
        referralId: 'ref-closed',
        status: 'CERRADO',
        notes: 'Atendido',
        changedById: 'prof-1',
        createdAt: hoursAgo(100),
      },
    ],
    createdAt: hoursAgo(120),
  };

  beforeEach(() => {
    referrals = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue([overdueReferral, onTimeReferral, closedReferral]),
      updateStatus: jest.fn(),
    };
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    roles = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    };
    systemParameters = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findByKey: jest.fn().mockResolvedValue(null),
    };
    useCase = new GetReferralTrackingUseCase(referrals, users, roles, systemParameters);
  });

  it('lanza ReferralForbiddenError si el usuario no es Administrador DBU', async () => {
    users.findById.mockResolvedValue({ id: 'tutor-1', roleId: 'role-tutor' } as User);
    roles.findById.mockResolvedValue({ id: 'role-tutor', name: 'Docente Tutor' } as Role);

    await expect(useCase.execute('tutor-1')).rejects.toThrow(ReferralForbiddenError);
  });

  it('marca como vencido un caso abierto más allá del plazo por defecto (48h)', async () => {
    users.findById.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin' } as User);
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);

    const report = await useCase.execute('admin-1');

    expect(report.deadlineHours).toBe(48);
    const overdueItem = report.items.find((i) => i.id === 'ref-overdue');
    expect(overdueItem?.isOverdue).toBe(true);
    const onTimeItem = report.items.find((i) => i.id === 'ref-on-time');
    expect(onTimeItem?.isOverdue).toBe(false);
  });

  it('nunca marca como vencido un caso ATENDIDO o CERRADO, sin importar el tiempo transcurrido', async () => {
    users.findById.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin' } as User);
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);

    const report = await useCase.execute('admin-1');

    const closedItem = report.items.find((i) => i.id === 'ref-closed');
    expect(closedItem?.isOverdue).toBe(false);
  });

  it('usa el umbral configurado en SystemParameter cuando existe', async () => {
    users.findById.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin' } as User);
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);
    systemParameters.findByKey.mockResolvedValue({
      id: 'p1',
      key: 'referral_followup_deadline_hours',
      value: '96',
      label: 'Plazo',
    });

    const report = await useCase.execute('admin-1');

    expect(report.deadlineHours).toBe(96);
    // El caso "vencido" (72h) ya no lo está con un plazo de 96h.
    const overdueItem = report.items.find((i) => i.id === 'ref-overdue');
    expect(overdueItem?.isOverdue).toBe(false);
  });

  it('agrupa el resumen por servicio con totales y vencidos', async () => {
    users.findById.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin' } as User);
    roles.findById.mockResolvedValue({ id: 'role-admin', name: 'Administrador DBU' } as Role);

    const report = await useCase.execute('admin-1');

    const psicologia = report.summary.find((s) => s.service === 'PSICOLOGIA');
    expect(psicologia?.total).toBe(2);
    expect(psicologia?.overdue).toBe(1);
    expect(psicologia?.byStatus.ENVIADO).toBe(1);
    expect(psicologia?.byStatus.CERRADO).toBe(1);

    const salud = report.summary.find((s) => s.service === 'SALUD');
    expect(salud?.total).toBe(1);
    expect(salud?.overdue).toBe(0);

    const asistenciaSocial = report.summary.find((s) => s.service === 'ASISTENCIA_SOCIAL');
    expect(asistenciaSocial?.total).toBe(0);
  });
});
