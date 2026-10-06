import { Response } from 'express';
import { z } from 'zod';
import { GetReportFilterOptionsUseCase } from '@application/use-cases/report-filters/GetReportFilterOptionsUseCase';
import { resolveReportPeriod } from '@application/use-cases/report-filters/reportFilters';
import {
  ReportFiltersForbiddenError,
  ReportPeriodNotFoundError,
} from '@application/use-cases/report-filters/ReportFilterErrors';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { handleReportFilterError, parseReportFilters } from '@interfaces/http/reportFilters';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';

describe('Filtros combinados de reportes (HU-47)', () => {
  describe('parseReportFilters', () => {
    it('acepta todos los filtros combinados y convierte el ciclo a número', () => {
      expect(
        parseReportFilters({ periodId: 'p1', facultyId: 'f1', schoolId: 's1', cycle: '4', tutorId: 't1' }),
      ).toEqual({ periodId: 'p1', facultyId: 'f1', schoolId: 's1', cycle: 4, tutorId: 't1' });
    });

    it('trata las cadenas vacías de los controles ("Todos") como filtro ausente', () => {
      const filters = parseReportFilters({ periodId: '', facultyId: '', schoolId: '', cycle: '', tutorId: '' });
      expect(Object.values(filters).every((v) => v === undefined)).toBe(true);
    });

    it('rechaza un ciclo fuera de rango o no numérico', () => {
      expect(() => parseReportFilters({ cycle: '0' })).toThrow(z.ZodError);
      expect(() => parseReportFilters({ cycle: '13' })).toThrow(z.ZodError);
      expect(() => parseReportFilters({ cycle: 'abc' })).toThrow(z.ZodError);
    });
  });

  describe('handleReportFilterError', () => {
    const res = () => {
      const r = { status: jest.fn(), json: jest.fn() };
      r.status.mockReturnValue(r);
      return r;
    };

    it('responde 400 a filtros inválidos y 404 a un semestre inexistente', () => {
      const bad = res();
      let zodError: unknown;
      try {
        parseReportFilters({ cycle: '99' });
      } catch (e) {
        zodError = e;
      }
      expect(handleReportFilterError(zodError, bad as unknown as Response)).toBe(true);
      expect(bad.status).toHaveBeenCalledWith(400);

      const missing = res();
      expect(handleReportFilterError(new ReportPeriodNotFoundError(), missing as unknown as Response)).toBe(true);
      expect(missing.status).toHaveBeenCalledWith(404);
    });

    it('devuelve false para otros errores, que maneja cada controlador', () => {
      const other = res();
      expect(handleReportFilterError(new Error('x'), other as unknown as Response)).toBe(false);
      expect(other.status).not.toHaveBeenCalled();
    });
  });

  describe('resolveReportPeriod', () => {
    const periods = { findActive: jest.fn(), findAll: jest.fn(), findById: jest.fn() } as jest.Mocked<AcademicPeriodRepository>;
    beforeEach(() => jest.clearAllMocks());

    it('usa el semestre indicado y, si no, el periodo activo', async () => {
      periods.findById.mockResolvedValue({ id: 'p0', name: '2026-I' } as never);
      periods.findActive.mockResolvedValue({ id: 'p1', name: '2026-II' } as never);

      expect((await resolveReportPeriod(periods, 'p0')).name).toBe('2026-I');
      expect((await resolveReportPeriod(periods)).name).toBe('2026-II');
    });

    it('falla con semestre inexistente o sin periodo activo', async () => {
      periods.findById.mockResolvedValue(null);
      await expect(resolveReportPeriod(periods, 'x')).rejects.toBeInstanceOf(ReportPeriodNotFoundError);

      periods.findActive.mockResolvedValue(null);
      await expect(resolveReportPeriod(periods)).rejects.toBeInstanceOf(NoActivePeriodError);
    });
  });

  describe('GetReportFilterOptionsUseCase', () => {
    let roleName: string;
    const build = () => {
      const users = {
        findById: jest.fn().mockImplementation(async (id: string) =>
          id === 'me' ? { id: 'me', roleId: 'r' } : { id, firstName: id.toUpperCase(), lastName: 'Tutor' },
        ),
      } as unknown as UserRepository;
      const roles = { findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })) } as unknown as RoleRepository;
      const periods = {
        findAll: jest.fn().mockResolvedValue([
          { id: 'p1', name: '2026-II', isActive: true },
          { id: 'p0', name: '2026-I', isActive: false },
        ]),
      } as unknown as AcademicPeriodRepository;
      const students = {
        findAll: jest.fn().mockResolvedValue([
          { schoolId: 'sc1', cycle: 3, tutorId: 't1' },
          { schoolId: 'sc1', cycle: 1, tutorId: null },
          { schoolId: 'sc2', cycle: 5, tutorId: 't2' },
        ]),
      } as unknown as StudentRepository;
      const schools = {
        findAll: jest.fn().mockResolvedValue([
          { id: 'sc1', name: 'Sistemas', facultyId: 'f1', coordinatorId: 'me' },
          { id: 'sc2', name: 'Civil', facultyId: 'f2', coordinatorId: 'otro' },
        ]),
      } as unknown as SchoolRepository;
      const faculties = {
        findAll: jest.fn().mockResolvedValue([
          { id: 'f1', name: 'Ingeniería' },
          { id: 'f2', name: 'Otra' },
        ]),
      } as unknown as FacultyRepository;
      return new GetReportFilterOptionsUseCase(users, roles, periods, students, schools, faculties);
    };

    it('la DBU y el Vicerrectorado reciben todos los semestres, escuelas, ciclos y tutores', async () => {
      roleName = 'Vicerrectorado';
      const options = await build().execute('me');

      expect(options.periods.map((p) => p.id)).toEqual(['p1', 'p0']);
      expect(options.schools.map((s) => s.id)).toEqual(['sc2', 'sc1']); // por nombre
      expect(options.faculties.map((f) => f.id)).toEqual(['f1', 'f2']);
      expect(options.cycles).toEqual([1, 3, 5]);
      expect(options.tutors.map((t) => t.id)).toEqual(['t1', 't2']);
    });

    it('el Coordinador solo recibe sus escuelas y los ciclos y tutores de sus tutorados', async () => {
      roleName = 'Coordinador';
      const options = await build().execute('me');

      expect(options.schools.map((s) => s.id)).toEqual(['sc1']);
      expect(options.faculties.map((f) => f.id)).toEqual(['f1']);
      expect(options.cycles).toEqual([1, 3]);
      expect(options.tutors.map((t) => t.id)).toEqual(['t1']);
    });

    it('rechaza a roles sin acceso a reportes', async () => {
      roleName = 'Docente Tutor';
      await expect(build().execute('me')).rejects.toBeInstanceOf(ReportFiltersForbiddenError);
    });
  });
});
