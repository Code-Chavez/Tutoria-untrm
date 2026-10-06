import { Request, Response } from 'express';
import {
  InvalidParameterValueError,
  ListSystemParametersUseCase,
  UnknownParameterError,
  UpdateSystemParameterUseCase,
} from '@application/use-cases/system-parameters/SystemParameterUseCases';
import { PARAMETER_DEFINITIONS } from '@application/use-cases/system-parameters/parameterDefinitions';
import { SystemParameterController } from '@interfaces/http/controllers/SystemParameterController';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';

describe('Parámetros del sistema (HU-49)', () => {
  let repo: jest.Mocked<SystemParameterRepository>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    repo = {
      findByKey: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (d) => ({ id: 'p', ...d })),
      update: jest.fn().mockImplementation(async (key, value) => ({ id: 'p', key, value, label: 'x' })),
    };
    audit = { create: jest.fn(), findAll: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
  });

  describe('listado', () => {
    it('expone los cuatro parámetros editables con sus rangos y valores predeterminados', async () => {
      const list = await new ListSystemParametersUseCase(repo).execute();
      expect(list.map((p) => p.key)).toEqual([
        'session_duration_minutes',
        'max_sessions_per_semester',
        'absence_alert_threshold',
        'referral_followup_deadline_hours',
      ]);
      expect(list.every((p) => p.isDefault)).toBe(true);
      expect(list.find((p) => p.key === 'session_duration_minutes')).toMatchObject({ value: 45, min: 15, max: 180 });
    });

    it('usa el valor guardado cuando es válido', async () => {
      repo.findAll.mockResolvedValue([{ id: '1', key: 'session_duration_minutes', value: '60', label: 'x' }]);
      const list = await new ListSystemParametersUseCase(repo).execute();
      expect(list[0]).toMatchObject({ value: 60, isDefault: false });
    });

    it('si el valor guardado es inválido o está fuera de rango rige el predeterminado', async () => {
      repo.findAll.mockResolvedValue([
        { id: '1', key: 'session_duration_minutes', value: 'abc', label: 'x' },
        { id: '2', key: 'max_sessions_per_semester', value: '999', label: 'x' },
      ]);
      const list = await new ListSystemParametersUseCase(repo).execute();
      expect(list[0]).toMatchObject({ value: 45, isDefault: true });
      expect(list[1]).toMatchObject({ value: 8, isDefault: true });
    });

    it('no expone parámetros que el sistema no consulta (bloqueo de sesión, inactividad)', async () => {
      repo.findAll.mockResolvedValue([{ id: '1', key: 'login_max_attempts', value: '3', label: 'x' }]);
      const keys = (await new ListSystemParametersUseCase(repo).execute()).map((p) => p.key);
      expect(keys).not.toContain('login_max_attempts');
    });
  });

  describe('edición', () => {
    const update = () => new UpdateSystemParameterUseCase(repo, audit);

    it('actualiza un valor existente y deja constancia en la bitácora del cambio', async () => {
      repo.findByKey.mockResolvedValue({ id: '1', key: 'absence_alert_threshold', value: '2', label: 'x' });

      const result = await update().execute('admin-1', 'absence_alert_threshold', 3);

      expect(repo.update).toHaveBeenCalledWith('absence_alert_threshold', '3');
      expect(result).toMatchObject({ value: 3, isDefault: false });
      expect(audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'UPDATE_PARAMETER',
          entityId: 'absence_alert_threshold',
          details: '2 → 3',
        }),
      );
    });

    it('si el parámetro aún no está guardado lo crea con su etiqueta', async () => {
      await update().execute('admin-1', 'session_duration_minutes', 50);
      expect(repo.create).toHaveBeenCalledWith({ key: 'session_duration_minutes', value: '50', label: 'Duración de la sesión' });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ details: '45 (predeterminado) → 50' }));
    });

    it('acepta el valor como texto numérico (campo de formulario)', async () => {
      await update().execute('admin-1', 'max_sessions_per_semester', '10');
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ value: '10' }));
    });

    it.each([
      ['session_duration_minutes', 14],
      ['session_duration_minutes', 181],
      ['max_sessions_per_semester', 0],
      ['absence_alert_threshold', 2.5],
      ['referral_followup_deadline_hours', 'abc'],
      ['referral_followup_deadline_hours', null],
    ])('rechaza %s = %p sin guardar nada', async (key, value) => {
      await expect(update().execute('admin-1', key, value)).rejects.toBeInstanceOf(InvalidParameterValueError);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(audit.create).not.toHaveBeenCalled();
    });

    it('rechaza un parámetro desconocido o no editable', async () => {
      await expect(update().execute('admin-1', 'login_max_attempts', 3)).rejects.toBeInstanceOf(UnknownParameterError);
    });

    it('los límites incluyen sus extremos', async () => {
      for (const d of PARAMETER_DEFINITIONS) {
        await expect(update().execute('a', d.key, d.min)).resolves.toBeDefined();
        await expect(update().execute('a', d.key, d.max)).resolves.toBeDefined();
      }
    });
  });

  describe('controlador', () => {
    const res = () => {
      const r = { status: jest.fn(), json: jest.fn() };
      r.status.mockReturnValue(r);
      return r;
    };
    const controller = () =>
      new SystemParameterController(new ListSystemParametersUseCase(repo), new UpdateSystemParameterUseCase(repo, audit));
    const req = (key: string, body: unknown) => ({ auth: { sub: 'a' }, params: { key }, body }) as unknown as Request;

    it('200 al actualizar, 400 ante un valor fuera de rango o un cuerpo inválido, 404 ante una clave desconocida', async () => {
      const ok = res();
      await controller().update(req('session_duration_minutes', { value: 50 }), ok as unknown as Response);
      expect(ok.status).toHaveBeenCalledWith(200);

      const range = res();
      await controller().update(req('session_duration_minutes', { value: 5 }), range as unknown as Response);
      expect(range.status).toHaveBeenCalledWith(400);

      const body = res();
      await controller().update(req('session_duration_minutes', {}), body as unknown as Response);
      expect(body.status).toHaveBeenCalledWith(400);

      const unknown = res();
      await controller().update(req('otra', { value: 1 }), unknown as unknown as Response);
      expect(unknown.status).toHaveBeenCalledWith(404);
    });
  });
});
