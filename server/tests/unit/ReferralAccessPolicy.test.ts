import { GetReferralsUseCase } from '@application/use-cases/referrals/GetReferralsUseCase';
import { GetReferralByIdUseCase } from '@application/use-cases/referrals/GetReferralByIdUseCase';
import {
  canManageReferral,
  canViewReferral,
  isForwardTransition,
  toReferralView,
  ReferralActor,
} from '@application/use-cases/referrals/referralAccess';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';

const SECRET = 'Nota clínica interna: antecedentes del tutorado';

const referral = (over: Partial<StudentReferral> = {}): StudentReferral =>
  ({
    id: 'ref-1',
    referredById: 'tutor-1',
    service: 'PSICOLOGIA',
    status: 'ATENDIDO',
    statusHistory: [
      { id: 'h2', status: 'ATENDIDO', notes: SECRET, changedById: 'prof-1', createdAt: new Date() },
      { id: 'h1', status: 'RECIBIDO', notes: null, changedById: 'prof-1', createdAt: new Date() },
    ],
    ...over,
  }) as StudentReferral;

const actor = (roleName: string, id: string, service: string | null = null): ReferralActor => ({ id, roleName, service });

describe('Política de acceso a derivaciones (A01, A02, A06)', () => {
  describe('canViewReferral / canManageReferral', () => {
    const r = referral();

    it.each([
      ['DBU', actor('Administrador DBU', 'd'), true, true],
      ['tutor emisor', actor('Docente Tutor', 'tutor-1'), true, false],
      ['otro tutor', actor('Docente Tutor', 'tutor-2'), false, false],
      ['profesional del servicio', actor('Profesional de Servicio', 'p', 'PSICOLOGIA'), true, true],
      ['profesional de otro servicio', actor('Profesional de Servicio', 'p', 'SALUD'), false, false],
      ['profesional sin servicio', actor('Profesional de Servicio', 'p', null), false, false],
      ['coordinador', actor('Coordinador', 'c'), false, false],
      ['vicerrectorado', actor('Vicerrectorado', 'v'), false, false],
      ['tutorado', actor('Tutorado', 't'), false, false],
    ])('%s: ver=%s, gestionar=%s', (_name, a, view, manage) => {
      expect(canViewReferral(a, r)).toBe(view);
      expect(canManageReferral(a, r)).toBe(manage);
    });
  });

  describe('isForwardTransition', () => {
    it('solo avanza', () => {
      expect(isForwardTransition('ENVIADO', 'CERRADO')).toBe(true);
      expect(isForwardTransition('RECIBIDO', 'EN_ATENCION')).toBe(true);
      expect(isForwardTransition('EN_ATENCION', 'RECIBIDO')).toBe(false);
      expect(isForwardTransition('ATENDIDO', 'ATENDIDO')).toBe(false);
      expect(isForwardTransition('ENVIADO', 'INVENTADO')).toBe(false);
    });
  });

  describe('toReferralView: notas internas por audiencia', () => {
    it('el tutor emisor conserva el historial de estados pero sin el contenido de las notas', () => {
      const view = toReferralView(referral(), actor('Docente Tutor', 'tutor-1'));

      expect(view.statusHistory).toHaveLength(2);
      expect(view.statusHistory?.map((h) => h.status)).toEqual(['ATENDIDO', 'RECIBIDO']);
      expect(view.statusHistory?.every((h) => h.notes === null)).toBe(true);
      expect(JSON.stringify(view)).not.toContain(SECRET);
    });

    it('la DBU y el profesional del servicio ven las notas', () => {
      expect(toReferralView(referral(), actor('Administrador DBU', 'd')).statusHistory?.[0].notes).toBe(SECRET);
      expect(toReferralView(referral(), actor('Profesional de Servicio', 'p', 'PSICOLOGIA')).statusHistory?.[0].notes).toBe(SECRET);
    });

    it('no modifica el original y tolera casos sin historial', () => {
      const original = referral();
      toReferralView(original, actor('Docente Tutor', 'tutor-1'));
      expect(original.statusHistory?.[0].notes).toBe(SECRET);
      expect(toReferralView(referral({ statusHistory: undefined }), actor('Docente Tutor', 'tutor-1')).statusHistory).toBeUndefined();
    });
  });

  describe('respuestas de los casos de uso (lo que viaja por HTTP)', () => {
    let referrals: jest.Mocked<StudentReferralRepository>;
    let roleName: string;
    let user: Record<string, unknown>;
    const users = { findById: jest.fn().mockImplementation(async () => user) } as unknown as UserRepository;
    const roles = { findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })) } as unknown as RoleRepository;

    beforeEach(() => {
      roleName = 'Docente Tutor';
      user = { id: 'tutor-1', roleId: 'r', isActive: true };
      referrals = {
        create: jest.fn(),
        findById: jest.fn().mockResolvedValue(referral()),
        findMany: jest.fn().mockResolvedValue([referral()]),
        updateStatus: jest.fn(),
      };
    });

    it('listado: el tutor no recibe las notas internas; el profesional sí', async () => {
      const tutorBody = JSON.stringify(await new GetReferralsUseCase(referrals, users, roles).execute('tutor-1'));
      expect(tutorBody).not.toContain(SECRET);
      expect(tutorBody).toContain('ATENDIDO');

      roleName = 'Profesional de Servicio';
      user = { id: 'p', roleId: 'r', service: 'PSICOLOGIA', isActive: true };
      expect(JSON.stringify(await new GetReferralsUseCase(referrals, users, roles).execute('p'))).toContain(SECRET);
    });

    it('detalle: el tutor no recibe las notas internas', async () => {
      const body = JSON.stringify(await new GetReferralByIdUseCase(referrals, users, roles).execute('ref-1', 'tutor-1'));
      expect(body).not.toContain(SECRET);
    });

    it('el listado del coordinador, del vicerrectorado y de una cuenta desactivada es vacío o denegado', async () => {
      roleName = 'Coordinador';
      expect(await new GetReferralsUseCase(referrals, users, roles).execute('c')).toEqual([]);

      roleName = 'Docente Tutor';
      user = { id: 'tutor-1', roleId: 'r', isActive: false };
      await expect(new GetReferralsUseCase(referrals, users, roles).execute('tutor-1')).rejects.toThrow();
    });

    it('un profesional sin servicio no obtiene ningún caso', async () => {
      roleName = 'Profesional de Servicio';
      user = { id: 'p', roleId: 'r', service: null, isActive: true };
      expect(await new GetReferralsUseCase(referrals, users, roles).execute('p')).toEqual([]);
      expect(referrals.findMany).not.toHaveBeenCalled();
    });
  });
});
