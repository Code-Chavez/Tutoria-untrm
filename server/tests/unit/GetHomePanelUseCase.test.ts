import { GetHomePanelUseCase } from '@application/use-cases/home-panel/GetHomePanelUseCase';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { GetIndicatorsUseCase } from '@application/use-cases/indicators/GetIndicatorsUseCase';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';
import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { SessionWithParticipants } from '@domain/entities/Session';
import { Student } from '@domain/entities/Student';
import { StudentReferral } from '@domain/entities/StudentReferral';

const future = (days: number) => new Date(Date.now() + days * 86_400_000);
const session = (over: Partial<SessionWithParticipants>) =>
  ({ cancelledAt: null, studentIds: ['a'], topic: 'Hábitos', ...over }) as SessionWithParticipants;
const referral = (status: string, over: Partial<StudentReferral> = {}) => ({ status, ...over }) as StudentReferral;

describe('GetHomePanelUseCase (HU-49)', () => {
  let roleName: string;
  let user: Record<string, unknown>;
  let users: jest.Mocked<UserRepository>;
  let students: jest.Mocked<StudentRepository>;
  let sessions: jest.Mocked<SessionRepository>;
  let referrals: jest.Mocked<StudentReferralRepository>;
  let indicators: jest.Mocked<GetIndicatorsUseCase>;
  let riskAlerts: jest.Mocked<GetRiskAlertsUseCase>;
  let evaluationStatus: jest.Mocked<GetEvaluationStatusUseCase>;

  beforeEach(() => {
    roleName = 'Docente Tutor';
    user = { id: 'u1', roleId: 'r1', firstName: 'Elena', lastName: 'Ramírez', service: null };
    users = {
      findById: jest.fn().mockImplementation(async (id: string) => (id === 'u1' ? user : { id, firstName: 'Elena', lastName: 'Ramírez' })),
    } as unknown as jest.Mocked<UserRepository>;
    students = { findAll: jest.fn().mockResolvedValue([]), findByUserId: jest.fn() } as unknown as jest.Mocked<StudentRepository>;
    sessions = { findAll: jest.fn().mockResolvedValue([]), findByStudent: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<SessionRepository>;
    referrals = { findMany: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<StudentReferralRepository>;
    indicators = { execute: jest.fn() } as unknown as jest.Mocked<GetIndicatorsUseCase>;
    riskAlerts = { execute: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<GetRiskAlertsUseCase>;
    evaluationStatus = { execute: jest.fn() } as unknown as jest.Mocked<GetEvaluationStatusUseCase>;
  });

  const run = () =>
    new GetHomePanelUseCase(
      users,
      { findById: jest.fn().mockImplementation(async () => ({ id: 'r1', name: roleName })) } as unknown as RoleRepository,
      { findActive: jest.fn().mockResolvedValue({ id: 'p1', name: '2026-II' }) } as unknown as AcademicPeriodRepository,
      students, sessions, referrals, indicators, riskAlerts, evaluationStatus,
    ).execute('u1');

  const kpi = (panel: Awaited<ReturnType<typeof run>>, key: string) => panel.kpis.find((k) => k.key === key);

  it('Docente Tutor: sus tutorados, sesiones próximas, alertas y derivaciones abiertas', async () => {
    students.findAll.mockResolvedValue([{ isAtRisk: true }, { isAtRisk: false }, { isAtRisk: false }] as Student[]);
    sessions.findAll.mockResolvedValue([
      session({ scheduledAt: future(3) }),
      session({ scheduledAt: future(1) }),
      session({ scheduledAt: future(2), cancelledAt: new Date() }), // cancelada: no cuenta
      session({ scheduledAt: new Date(Date.now() - 86_400_000) }), // pasada
    ]);
    riskAlerts.execute.mockResolvedValue([{}, {}] as never);
    referrals.findMany.mockResolvedValue([referral('ENVIADO'), referral('CERRADO'), referral('EN_ATENCION')]);

    const panel = await run();

    expect(panel.role).toBe('Docente Tutor');
    expect(panel.periodName).toBe('2026-II');
    expect(students.findAll).toHaveBeenCalledWith({ tutorId: 'u1', isActive: true });
    expect(kpi(panel, 'my-students')).toMatchObject({ value: '3', hint: '1 en riesgo' });
    expect(kpi(panel, 'upcoming-sessions')?.value).toBe('2');
    expect(kpi(panel, 'upcoming-sessions')?.hint).toMatch(/^Siguiente: /);
    expect(kpi(panel, 'alerts')).toMatchObject({ value: '2', tone: 'warning' });
    expect(riskAlerts.execute).toHaveBeenCalledWith({ tutorId: 'u1' });
    expect(referrals.findMany).toHaveBeenCalledWith({ referredById: 'u1' });
    expect(kpi(panel, 'open-referrals')?.value).toBe('2');
  });

  it('Docente Tutor sin sesiones ni alertas: ceros y estado neutro', async () => {
    const panel = await run();
    expect(kpi(panel, 'upcoming-sessions')).toMatchObject({ value: '0', hint: 'Sin sesiones programadas' });
    expect(kpi(panel, 'alerts')?.tone).toBe('neutral');
  });

  it.each(['Coordinador', 'Administrador DBU', 'Vicerrectorado'])('%s: indicadores del tablero con el alcance de su rol', async (name) => {
    roleName = name;
    indicators.execute.mockResolvedValue({
      students: { active: 40, withTutor: 30, withoutTutor: 10, assignedPct: 75 },
      sessions: { coveragePct: 60, studentsServed: 24, total: 15 },
      risk: { atRisk: 8, atRiskPct: 20 },
      referrals: { total: 6 },
      evaluation: { responses: 1, averageScore: 4.25 },
    } as never);

    const panel = await run();

    expect(indicators.execute).toHaveBeenCalledWith('u1'); // el alcance (Coordinador = sus escuelas) lo aplica el caso de uso de indicadores
    expect(panel.kpis.map((k) => k.key)).toEqual(['students', 'coverage', 'risk', 'referrals', 'evaluation']);
    expect(kpi(panel, 'coverage')?.value).toBe('60%');
    expect(kpi(panel, 'evaluation')).toMatchObject({ value: '4.25 / 5', hint: '1 respuesta' });
    expect(panel.kpis.every((k) => k.link === '/indicadores')).toBe(true);
  });

  it('gestión sin periodo activo: panel vacío en lugar de error', async () => {
    roleName = 'Administrador DBU';
    indicators.execute.mockRejectedValue(new Error('NoActivePeriod'));
    expect((await run()).kpis).toEqual([]);
  });

  it('Profesional de Servicio: solo las derivaciones de su servicio', async () => {
    roleName = 'Profesional de Servicio';
    user.service = 'PSICOLOGIA';
    referrals.findMany.mockResolvedValue([
      referral('ENVIADO'), referral('ENVIADO'), referral('RECIBIDO'), referral('EN_ATENCION'), referral('ATENDIDO'), referral('CERRADO'),
    ]);

    const panel = await run();

    expect(referrals.findMany).toHaveBeenCalledWith({ service: 'PSICOLOGIA' });
    expect(kpi(panel, 'to-receive')).toMatchObject({ value: '2', tone: 'warning' });
    expect(kpi(panel, 'in-care')?.value).toBe('2');
    expect(kpi(panel, 'attended')?.value).toBe('1');
    expect(kpi(panel, 'closed')?.value).toBe('1');
  });

  it('Profesional de Servicio sin servicio asignado: lo avisa', async () => {
    roleName = 'Profesional de Servicio';
    const panel = await run();
    expect(panel.kpis).toHaveLength(1);
    expect(panel.kpis[0].key).toBe('no-service');
    expect(referrals.findMany).not.toHaveBeenCalled();
  });

  it('Tutorado: su tutor, su próxima sesión y el estado de la evaluación', async () => {
    roleName = 'Tutorado';
    students.findByUserId.mockResolvedValue({ id: 'a', tutorId: 't9' } as Student);
    sessions.findByStudent.mockResolvedValue([
      session({ scheduledAt: future(5), topic: 'Taller' }),
      session({ scheduledAt: future(2), topic: 'Hábitos de estudio' }),
    ]);
    evaluationStatus.execute.mockResolvedValue({ canRespond: true, alreadyResponded: false, periodName: '2026-II' });

    const panel = await run();

    expect(kpi(panel, 'my-tutor')?.value).toBe('Elena Ramírez');
    expect(kpi(panel, 'next-session')?.hint).toBe('Hábitos de estudio'); // la más cercana
    expect(kpi(panel, 'evaluation')).toMatchObject({ value: 'Pendiente', link: '/evaluar-tutoria' });
  });

  it.each([
    [{ canRespond: false, alreadyResponded: true, periodName: 'x' }, 'Respondida', undefined],
    [{ canRespond: false, alreadyResponded: false, periodName: 'x' }, 'No disponible', undefined],
  ])('Tutorado: evaluación %j → %s', async (status, value, link) => {
    roleName = 'Tutorado';
    students.findByUserId.mockResolvedValue({ id: 'a', tutorId: null } as Student);
    evaluationStatus.execute.mockResolvedValue(status);

    const panel = await run();

    expect(kpi(panel, 'my-tutor')?.value).toBe('Sin asignar');
    expect(kpi(panel, 'evaluation')?.value).toBe(value);
    expect(kpi(panel, 'evaluation')?.link).toBe(link);
  });

  it('Tutorado sin perfil vinculado: lo avisa en vez de fallar', async () => {
    roleName = 'Tutorado';
    students.findByUserId.mockResolvedValue(null);
    const panel = await run();
    expect(panel.kpis[0].key).toBe('no-profile');
  });

  it('un rol sin panel propio recibe una lista vacía y un usuario inexistente, un panel vacío', async () => {
    roleName = 'Otro rol';
    expect((await run()).kpis).toEqual([]);

    users.findById.mockResolvedValue(null);
    expect(await run()).toEqual({ role: '', periodName: null, kpis: [] });
  });
});
