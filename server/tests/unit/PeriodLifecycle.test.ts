import {
  ClosePeriodUseCase,
  GetCurrentPeriodUseCase,
  GetPeriodClosureUseCase,
  PeriodConfirmationError,
  PeriodNotActiveError,
  PeriodNotFoundError,
  PeriodReopenError,
  ReopenPeriodUseCase,
} from '@application/use-cases/periods/PeriodLifecycleUseCases';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { PeriodSummary, PeriodSummaryRepository } from '@domain/repositories/PeriodSummaryRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';

const NOW = new Date('2026-12-20T15:00:00Z');
const period = (over: Partial<AcademicPeriod> = {}): AcademicPeriod => ({
  id: 'p1',
  name: '2026-II',
  startDate: new Date('2026-08-24'),
  endDate: new Date('2026-12-18'),
  isActive: true,
  createdAt: new Date('2026-08-01'),
  closedAt: null,
  ...over,
});
const summary: PeriodSummary = {
  students: { total: 70, active: 68, atRisk: 4 },
  tutors: 5,
  sessions: { total: 120, individual: 90, group: 30, cancelled: 8, withAttendance: 80 },
  referrals: { total: 9, open: 2 },
  tutoringRequests: { total: 14, open: 3 },
  evaluations: { responses: 41 },
  semesterReports: { submitted: 5 },
  pending: { openRequests: 3, openReferrals: 2, upcomingSessions: 1 },
};

describe('ciclo de vida del periodo (fase 1)', () => {
  let periods: jest.Mocked<AcademicPeriodRepository>;
  let summaries: jest.Mocked<PeriodSummaryRepository>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    periods = {
      findActive: jest.fn().mockResolvedValue(period()),
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(period()),
      findByDate: jest.fn(),
      close: jest.fn().mockResolvedValue(true),
      reopen: jest.fn().mockResolvedValue(true),
    };
    summaries = { summarize: jest.fn().mockResolvedValue(summary) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
  });

  describe('cerrar', () => {
    const close = () => new ClosePeriodUseCase(periods, summaries, audit, () => NOW);

    it('guarda el resumen, quién y cuándo, y deja el periodo cerrado', async () => {
      const result = await close().execute('admin-1', 'p1', '2026-II', '10.0.0.1');

      expect(periods.close).toHaveBeenCalledWith('p1', 'admin-1', NOW, summary);
      expect(result).toMatchObject({ state: 'CERRADO', closedAt: NOW, isPreview: false, summary });
    });

    it('exige escribir el nombre exacto del periodo (evita un cierre accidental)', async () => {
      await expect(close().execute('admin-1', 'p1', '2026-I')).rejects.toBeInstanceOf(PeriodConfirmationError);
      await expect(close().execute('admin-1', 'p1', '')).rejects.toBeInstanceOf(PeriodConfirmationError);

      expect(periods.close).not.toHaveBeenCalled();
    });

    it('tolera espacios alrededor del nombre escrito', async () => {
      await expect(close().execute('admin-1', 'p1', '  2026-II ')).resolves.toBeDefined();
    });

    it('solo se cierra el periodo vigente', async () => {
      periods.findById.mockResolvedValue(period({ isActive: false, closedAt: new Date('2026-12-19') }));

      await expect(close().execute('admin-1', 'p1', '2026-II')).rejects.toBeInstanceOf(PeriodNotActiveError);

      expect(periods.close).not.toHaveBeenCalled();
    });

    it('si otro proceso lo cerró antes (cierre simultáneo), no se registra dos veces', async () => {
      periods.close.mockResolvedValue(false);

      await expect(close().execute('admin-1', 'p1', '2026-II')).rejects.toBeInstanceOf(PeriodNotActiveError);

      expect(audit.create).not.toHaveBeenCalled();
    });

    it('un periodo que no existe se rechaza', async () => {
      periods.findById.mockResolvedValue(null);

      await expect(close().execute('admin-1', 'x', '2026-II')).rejects.toBeInstanceOf(PeriodNotFoundError);
    });

    it('queda en la bitácora con conteos, sin datos de personas', async () => {
      await close().execute('admin-1', 'p1', '2026-II', '10.0.0.1');

      const entry = audit.create.mock.calls[0][0];
      expect(entry).toMatchObject({ userId: 'admin-1', action: 'PERIOD_CLOSED', entity: 'AcademicPeriod', entityId: 'p1', ipAddress: '10.0.0.1' });
      expect(entry.details).toMatch(/70 estudiantes.*120 sesiones.*3 solicitudes y 2 derivaciones abiertas/);
    });
  });

  describe('consultar el cierre', () => {
    const view = () => new GetPeriodClosureUseCase(periods, summaries, () => NOW);

    it('un periodo vigente muestra una vista previa calculada ahora', async () => {
      const result = await view().execute('p1');

      expect(result).toMatchObject({ state: 'VIGENTE', isPreview: true, summary });
      expect(summaries.summarize).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), NOW);
    });

    it('un periodo cerrado muestra el resumen guardado al cerrarlo, sin recalcular', async () => {
      periods.findById.mockResolvedValue(period({ isActive: false, closedAt: new Date('2026-12-19'), closureSummary: summary }));

      const result = await view().execute('p1');

      expect(result).toMatchObject({ state: 'CERRADO', isPreview: false, summary });
      expect(summaries.summarize).not.toHaveBeenCalled();
    });

    it('un periodo que nunca se abrió se muestra como «sin abrir»', async () => {
      periods.findById.mockResolvedValue(period({ isActive: false, closedAt: null }));

      expect((await view().execute('p1')).state).toBe('SIN_ABRIR');
    });

    it('no existe → no encontrado', async () => {
      periods.findById.mockResolvedValue(null);

      await expect(view().execute('x')).rejects.toBeInstanceOf(PeriodNotFoundError);
    });
  });

  describe('reabrir (recuperar un cierre por error)', () => {
    const reopen = () => new ReopenPeriodUseCase(periods, audit);

    it('reabre y lo deja en la bitácora', async () => {
      periods.findById.mockResolvedValue(period({ isActive: false, closedAt: new Date('2026-12-19') }));

      await reopen().execute('admin-1', 'p1', '10.0.0.1');

      expect(periods.reopen).toHaveBeenCalledWith('p1');
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'PERIOD_REOPENED', entityId: 'p1' });
    });

    it('se rechaza si hay otro periodo vigente o el periodo no estaba cerrado', async () => {
      periods.reopen.mockResolvedValue(false);

      await expect(reopen().execute('admin-1', 'p1')).rejects.toBeInstanceOf(PeriodReopenError);

      expect(audit.create).not.toHaveBeenCalled();
    });
  });

  describe('periodo vigente', () => {
    it('abierto cuando hay uno vigente, en solo lectura cuando no', async () => {
      const current = new GetCurrentPeriodUseCase(periods);

      expect(await current.execute()).toMatchObject({ open: true, period: { name: '2026-II' } });

      periods.findActive.mockResolvedValue(null);
      expect(await current.execute()).toEqual({ open: false, period: null });
    });
  });
});
