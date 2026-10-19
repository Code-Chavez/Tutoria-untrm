import { GetInstitutionalPendingUseCase } from '@application/use-cases/pending/GetInstitutionalPendingUseCase';
import { StudentAccessDeniedError } from '@application/use-cases/students/StudentErrors';

// Bandeja de pendientes institucionales: solo lee y muestra lo que nadie vería solo. Escenarios combinados con datos ficticios.
const NOW = new Date('2026-10-18T12:00:00Z');
const day = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

type Assignment = {
  id: string;
  cycle: number;
  tutorId: string;
  acceptanceStatus: string;
  acceptanceExpiresAt?: Date | null;
  respondedAt?: Date | null;
  declineReason?: string | null;
  createdAt: Date;
};

function build(opts: {
  scope?: { kind: 'ALL' } | { kind: 'SCHOOLS'; schoolIds: string[] } | { kind: 'TUTOR'; tutorId: string } | { kind: 'NONE' };
  assignments?: Record<string, Assignment[]>;
  enrolled?: Record<string, [number, { total: number; withoutTutor: number }][]>;
  inactive?: string[];
  audit?: { action: string; entityId: string; details: string; createdAt: Date }[];
  requests?: { id: string; studentId: string; sessionId: string | null; status: string }[];
  sessions?: Record<string, { cancelledAt: Date | null; cancelReason?: string | null }>;
}) {
  const schools = [
    { id: 'sys', name: 'Ingeniería de Sistemas' },
    { id: 'mec', name: 'Mecánica Eléctrica' },
  ];
  const students: Record<string, { id: string; schoolId: string; cycle: number; firstName: string; lastName: string }> = {
    s1: { id: 's1', schoolId: 'sys', cycle: 3, firstName: 'Ana', lastName: 'Torres' },
    s2: { id: 's2', schoolId: 'mec', cycle: 5, firstName: 'Luis', lastName: 'Pérez' },
  };
  const guard = { scopeFor: jest.fn().mockResolvedValue(opts.scope ?? { kind: 'ALL' }) };
  const periods = { findActive: jest.fn().mockResolvedValue({ id: 'p1', startDate: day(60) }) };
  const schoolRepo = { findAll: jest.fn().mockResolvedValue(schools) };
  const cycleTutors = {
    listBySchool: jest.fn().mockImplementation(async (_p: string, s: string) => opts.assignments?.[s] ?? []),
    enrolledByCycle: jest.fn().mockImplementation(async (_p: string, s: string) => new Map(opts.enrolled?.[s] ?? [])),
  };
  const users = {
    findById: jest.fn().mockImplementation(async (id: string) => ({ id, firstName: id, lastName: 'Docente', isActive: !(opts.inactive ?? []).includes(id) })),
  };
  const audit = { findAll: jest.fn().mockResolvedValue(opts.audit ?? []) };
  const requests = { findAll: jest.fn().mockResolvedValue(opts.requests ?? []) };
  const sessions = { findById: jest.fn().mockImplementation(async (id: string) => opts.sessions?.[id] ?? null) };
  const studentRepo = { findById: jest.fn().mockImplementation(async (id: string) => students[id] ?? null) };
  const useCase = new GetInstitutionalPendingUseCase(
    guard as never,
    periods as never,
    schoolRepo as never,
    cycleTutors as never,
    users as never,
    audit as never,
    requests as never,
    sessions as never,
    studentRepo as never,
    () => NOW,
  );
  return { run: () => useCase.execute('u1'), periods };
}

const a = (over: Partial<Assignment>): Assignment => ({ id: 'a1', cycle: 3, tutorId: 'elena', acceptanceStatus: 'ACEPTADA', createdAt: day(30), ...over });
const kinds = (r: { items: { kind: string }[] }) => r.items.map((i) => i.kind);

describe('pendientes institucionales', () => {
  it('un docente que aceptó y está activo no genera ningún pendiente', async () => {
    const r = await build({ assignments: { sys: [a({})] } }).run();
    expect(r.items).toEqual([]);
  });

  it('un rechazo aparece con el motivo y desde cuándo', async () => {
    const r = await build({ assignments: { sys: [a({ acceptanceStatus: 'RECHAZADA', respondedAt: day(5), declineReason: 'Licencia por salud' })] } }).run();
    expect(kinds(r)).toEqual(['DESIGNATION_REJECTED']);
    expect(r.items[0]).toMatchObject({ detail: 'Motivo: Licencia por salud', since: day(5).toISOString(), cycle: 3, schoolName: 'Ingeniería de Sistemas' });
  });

  it('pendiente con enlace vencido es «sin respuesta»; con enlace vigente aún no es un pendiente', async () => {
    const vencido = await build({ assignments: { sys: [a({ acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: day(2) })] } }).run();
    expect(kinds(vencido)).toEqual(['DESIGNATION_NO_RESPONSE']);
    const vigente = await build({ assignments: { sys: [a({ acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: new Date(NOW.getTime() + 3_600_000) })] } }).run();
    expect(vigente.items).toEqual([]);
  });

  it('si el correo no salió se dice eso (la causa), no «sin respuesta», aunque el enlace también esté vencido', async () => {
    const r = await build({
      assignments: { sys: [a({ acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: day(2) })] },
      audit: [
        { action: 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED', entityId: 'a1', details: 'Sistemas · ciclo 3', createdAt: day(10) },
        { action: 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED', entityId: 'a1', details: 'Sistemas · ciclo 3 (correo no enviado)', createdAt: day(4) },
      ],
    }).run();
    expect(kinds(r)).toEqual(['ACCEPTANCE_EMAIL_FAILED']);
  });

  it('si el último reenvío sí salió, un fallo anterior ya no cuenta', async () => {
    const r = await build({
      assignments: { sys: [a({ acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: new Date(NOW.getTime() + 3_600_000) })] },
      audit: [
        { action: 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED', entityId: 'a1', details: 'Sistemas · ciclo 3 (correo no enviado)', createdAt: day(4) },
        { action: 'CYCLE_TUTOR_ACCEPTANCE_REQUESTED', entityId: 'a1', details: 'Sistemas · ciclo 3', createdAt: day(1) },
      ],
    }).run();
    expect(r.items).toEqual([]);
  });

  it('combinado: rechazó y además su cuenta está desactivada → dos pendientes distintos del mismo ciclo', async () => {
    const r = await build({ assignments: { sys: [a({ acceptanceStatus: 'RECHAZADA', respondedAt: day(3) })] }, inactive: ['elena'] }).run();
    expect(kinds(r).sort()).toEqual(['DESIGNATION_REJECTED', 'TUTOR_INACTIVE']);
  });

  it('un ciclo con estudiantes y sin tutor se avisa; con tutor designado no (aunque falte aceptar)', async () => {
    const r = await build({
      assignments: { sys: [a({ cycle: 4 })] },
      enrolled: {
        sys: [
          [3, { total: 40, withoutTutor: 40 }],
          [4, { total: 10, withoutTutor: 10 }],
          [5, { total: 8, withoutTutor: 0 }],
        ],
      },
    }).run();
    expect(kinds(r)).toEqual(['CYCLE_WITHOUT_TUTOR']);
    expect(r.items[0].title).toContain('Ciclo 3');
    expect(r.items[0].title).toContain('40 estudiantes sin tutor');
  });

  it('la cita cancelada de una solicitud sin atender aparece; atendida o con cita vigente, no', async () => {
    const r = await build({
      requests: [
        { id: 'r1', studentId: 's1', sessionId: 'x1', status: 'EN_ATENCION' }, // cita cancelada, sigue esperando
        { id: 'r2', studentId: 's1', sessionId: 'x2', status: 'ATENDIDA' }, // ya se atendió
        { id: 'r3', studentId: 's1', sessionId: 'x3', status: 'EN_ATENCION' }, // cita vigente
        { id: 'r4', studentId: 's1', sessionId: null, status: 'PENDIENTE' }, // aún sin cita: eso es la bandeja de solicitudes
      ],
      sessions: { x1: { cancelledAt: day(2), cancelReason: 'Paro de transporte' }, x2: { cancelledAt: day(2) }, x3: { cancelledAt: null } },
    }).run();
    expect(kinds(r)).toEqual(['CANCELLED_SESSION_NO_FOLLOWUP']);
    expect(r.items[0]).toMatchObject({ link: '/solicitudes?solicitud=r1' });
    expect(r.items[0].detail).toContain('Paro de transporte');
  });

  it('la coordinación solo ve las escuelas que coordina; la DBU, todas', async () => {
    const data = {
      assignments: { sys: [a({ id: 'a1', acceptanceStatus: 'RECHAZADA' })], mec: [a({ id: 'a2', acceptanceStatus: 'RECHAZADA' })] },
      requests: [{ id: 'r1', studentId: 's2', sessionId: 'x1', status: 'EN_ATENCION' }],
      sessions: { x1: { cancelledAt: day(1) } },
    };
    const coord = await build({ ...data, scope: { kind: 'SCHOOLS', schoolIds: ['sys'] } }).run();
    expect(coord.items.map((i) => i.schoolId)).toEqual(['sys']);
    const dbu = await build({ ...data, scope: { kind: 'ALL' } }).run();
    expect(dbu.items.map((i) => i.schoolId).sort()).toEqual(['mec', 'mec', 'sys']);
  });

  it('un docente tutor o una cuenta sin alcance no accede', async () => {
    await expect(build({ scope: { kind: 'TUTOR', tutorId: 'elena' } }).run()).rejects.toBeInstanceOf(StudentAccessDeniedError);
    await expect(build({ scope: { kind: 'NONE' } }).run()).rejects.toBeInstanceOf(StudentAccessDeniedError);
  });

  it('lo que lleva más tiempo esperando va primero', async () => {
    const r = await build({
      assignments: {
        sys: [a({ id: 'a1', cycle: 1, acceptanceStatus: 'RECHAZADA', respondedAt: day(2) }), a({ id: 'a2', cycle: 2, acceptanceStatus: 'RECHAZADA', respondedAt: day(9) })],
      },
    }).run();
    expect(r.items.map((i) => i.cycle)).toEqual([2, 1]);
  });

  it('sin periodo activo no inventa pendientes de ciclos', async () => {
    const b = build({ assignments: { sys: [a({ acceptanceStatus: 'RECHAZADA' })] } });
    b.periods.findActive.mockResolvedValue(null);
    expect((await b.run()).items).toEqual([]);
  });
});
