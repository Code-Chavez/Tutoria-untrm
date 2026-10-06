import { UpdateReferralStatusUseCase } from '@application/use-cases/referrals/UpdateReferralStatusUseCase';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import {
  ReferralNotFoundError,
  ReferralClosedError,
  ClosureNotesRequiredError,
  ReferralForbiddenError,
  ReferralStatusForbiddenError,
  InvalidReferralTransitionError,
  ReferralConflictError,
} from '@application/use-cases/referrals/ReferralErrors';

describe('UpdateReferralStatusUseCase (HU-32)', () => {
  let repository: jest.Mocked<StudentReferralRepository>;
  let notifications: jest.Mocked<NotificationRepository>;
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let useCase: UpdateReferralStatusUseCase;
  let actor: Record<string, unknown>;
  let roleName: string;

  const mockReferral: StudentReferral = {
    id: 'ref-123',
    studentId: 'stud-1',
    referredById: 'tutor-1',
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING'],
    reason: 'Motivo de prueba',
    service: 'PSICOLOGIA',
    receivingInstance: 'Gabinete Psicológico',
    status: 'EN_ATENCION',
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Por defecto actúa el profesional del servicio destino (el caso normal).
    roleName = 'Profesional de Servicio';
    actor = { id: 'prof-1', roleId: 'r', service: 'PSICOLOGIA', isActive: true };
    repository = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), updateStatus: jest.fn() };
    notifications = { create: jest.fn(), findByUser: jest.fn(), markRead: jest.fn() };
    users = { findById: jest.fn().mockImplementation(async () => actor) } as unknown as jest.Mocked<UserRepository>;
    roles = { findById: jest.fn().mockImplementation(async () => ({ id: 'r', name: roleName })) } as unknown as jest.Mocked<RoleRepository>;
    useCase = new UpdateReferralStatusUseCase(repository, notifications, users, roles);
  });

  describe('flujo normal', () => {
    it('actualiza el estado condicionándolo al estado que vio quien lo cambia', async () => {
      repository.findById.mockResolvedValue(mockReferral);
      repository.updateStatus.mockResolvedValue({ ...mockReferral, status: 'ATENDIDO' });

      const result = await useCase.execute('ref-123', 'ATENDIDO', 'prof-1', 'Se brindó atención integral');

      expect(repository.updateStatus).toHaveBeenCalledWith('ref-123', 'ATENDIDO', 'prof-1', 'Se brindó atención integral', 'EN_ATENCION');
      expect(result.status).toBe('ATENDIDO');
    });

    it('notifica al tutor emisor sin exponer las notas (HU-33)', async () => {
      repository.findById.mockResolvedValue(mockReferral);
      repository.updateStatus.mockResolvedValue({ ...mockReferral, status: 'ATENDIDO' });

      await useCase.execute('ref-123', 'ATENDIDO', 'prof-1', 'Nota interna confidencial');

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'tutor-1', type: 'REFERRAL_STATUS_CHANGED', referralId: 'ref-123' }),
      );
      expect(JSON.stringify(notifications.create.mock.calls)).not.toContain('Nota interna confidencial');
    });

    it('la DBU también puede gestionar cualquier caso', async () => {
      roleName = 'Administrador DBU';
      actor = { id: 'dbu-1', roleId: 'r', isActive: true };
      repository.findById.mockResolvedValue(mockReferral);
      repository.updateStatus.mockResolvedValue({ ...mockReferral, status: 'ATENDIDO' });

      await expect(useCase.execute('ref-123', 'ATENDIDO', 'dbu-1', 'Atención')).resolves.toBeDefined();
    });
  });

  describe('quién puede cambiar el estado (A02)', () => {
    beforeEach(() => repository.findById.mockResolvedValue(mockReferral));

    it('un profesional de OTRO servicio no puede ni ver ni modificar el caso', async () => {
      actor = { id: 'prof-2', roleId: 'r', service: 'SALUD', isActive: true };
      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-2', 'x')).rejects.toBeInstanceOf(ReferralForbiddenError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('el tutor emisor ve su caso pero no registra recepción, atención ni cierre', async () => {
      roleName = 'Docente Tutor';
      actor = { id: 'tutor-1', roleId: 'r', isActive: true };
      await expect(useCase.execute('ref-123', 'CERRADO', 'tutor-1', 'cierro yo')).rejects.toBeInstanceOf(ReferralStatusForbiddenError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('otro tutor, el coordinador y el vicerrectorado reciben 403', async () => {
      for (const [name, id] of [['Docente Tutor', 'tutor-2'], ['Coordinador', 'coord-1'], ['Vicerrectorado', 'vice-1']]) {
        roleName = name;
        actor = { id, roleId: 'r', isActive: true };
        await expect(useCase.execute('ref-123', 'RECIBIDO', id)).rejects.toBeInstanceOf(ReferralForbiddenError);
      }
    });

    it('un profesional sin servicio asignado no gestiona nada', async () => {
      actor = { id: 'prof-3', roleId: 'r', service: null, isActive: true };
      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-3', 'x')).rejects.toBeInstanceOf(ReferralForbiddenError);
    });

    it('una cuenta desactivada no actúa aunque conserve el rol', async () => {
      actor = { ...actor, isActive: false };
      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-1', 'x')).rejects.toBeInstanceOf(ReferralForbiddenError);
    });
  });

  describe('transiciones (A02)', () => {
    it.each([
      ['ENVIADO', 'RECIBIDO'],
      ['ENVIADO', 'EN_ATENCION'],
      ['RECIBIDO', 'EN_ATENCION'],
      ['EN_ATENCION', 'ATENDIDO'],
      ['ATENDIDO', 'CERRADO'],
    ] as const)('permite avanzar de %s a %s', async (from, to) => {
      repository.findById.mockResolvedValue({ ...mockReferral, status: from });
      repository.updateStatus.mockResolvedValue({ ...mockReferral, status: to });
      await expect(useCase.execute('ref-123', to, 'prof-1', 'nota')).resolves.toBeDefined();
    });

    it.each([
      ['EN_ATENCION', 'RECIBIDO'],
      ['ATENDIDO', 'ENVIADO'],
      ['ATENDIDO', 'EN_ATENCION'],
      ['RECIBIDO', 'RECIBIDO'],
    ] as const)('rechaza retroceder o repetir: %s → %s', async (from, to) => {
      repository.findById.mockResolvedValue({ ...mockReferral, status: from });
      await expect(useCase.execute('ref-123', to, 'prof-1', 'nota')).rejects.toBeInstanceOf(InvalidReferralTransitionError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('concurrencia (A02)', () => {
    it('si otra petición cambió el estado antes, devuelve un conflicto y no notifica', async () => {
      repository.findById.mockResolvedValue(mockReferral);
      repository.updateStatus.mockResolvedValue(null); // el estado ya no era EN_ATENCION

      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-1', 'x')).rejects.toBeInstanceOf(ReferralConflictError);
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('validaciones previas', () => {
    it('ReferralNotFoundError si la derivación no existe', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(useCase.execute('invalid-id', 'RECIBIDO', 'prof-1')).rejects.toThrow(ReferralNotFoundError);
    });

    it('ReferralClosedError si ya está CERRADO', async () => {
      repository.findById.mockResolvedValue({ ...mockReferral, status: 'CERRADO' });
      await expect(useCase.execute('ref-123', 'EN_ATENCION', 'prof-1')).rejects.toThrow(ReferralClosedError);
    });

    it('exige observaciones al marcar ATENDIDO o CERRADO', async () => {
      repository.findById.mockResolvedValue(mockReferral);
      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-1', '')).rejects.toThrow(ClosureNotesRequiredError);
      await expect(useCase.execute('ref-123', 'ATENDIDO', 'prof-1', '   ')).rejects.toThrow(ClosureNotesRequiredError);
      await expect(useCase.execute('ref-123', 'CERRADO', 'prof-1')).rejects.toThrow(ClosureNotesRequiredError);
    });

    it('rechaza un estado inexistente', async () => {
      await expect(useCase.execute('ref-123', 'ESTADO_INVALIDO', 'prof-1')).rejects.toThrow("Estado 'ESTADO_INVALIDO' no es válido");
    });
  });
});
