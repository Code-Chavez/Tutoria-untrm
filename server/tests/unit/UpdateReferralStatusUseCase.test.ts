import { UpdateReferralStatusUseCase } from '@application/use-cases/referrals/UpdateReferralStatusUseCase';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import {
  ReferralNotFoundError,
  ReferralClosedError,
  ClosureNotesRequiredError,
} from '@application/use-cases/referrals/ReferralErrors';

describe('UpdateReferralStatusUseCase (HU-32)', () => {
  let repository: jest.Mocked<StudentReferralRepository>;
  let notifications: jest.Mocked<NotificationRepository>;
  let useCase: UpdateReferralStatusUseCase;

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
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
    };
    notifications = {
      create: jest.fn(),
      findByUser: jest.fn(),
      markRead: jest.fn(),
    };
    useCase = new UpdateReferralStatusUseCase(repository, notifications);
  });

  it('debe actualizar el estado cuando los datos son válidos', async () => {
    repository.findById.mockResolvedValue(mockReferral);
    const updatedReferral = { ...mockReferral, status: 'ATENDIDO' as const };
    repository.updateStatus.mockResolvedValue(updatedReferral);

    const result = await useCase.execute('ref-123', 'ATENDIDO', 'user-2', 'Se brindó atención integral');

    expect(repository.findById).toHaveBeenCalledWith('ref-123');
    expect(repository.updateStatus).toHaveBeenCalledWith('ref-123', 'ATENDIDO', 'user-2', 'Se brindó atención integral');
    expect(result.status).toBe('ATENDIDO');
  });

  it('notifica al tutor emisor tras el cambio de estado (HU-33)', async () => {
    repository.findById.mockResolvedValue(mockReferral);
    const updatedReferral = { ...mockReferral, status: 'ATENDIDO' as const };
    repository.updateStatus.mockResolvedValue(updatedReferral);

    await useCase.execute('ref-123', 'ATENDIDO', 'user-2', 'Se brindó atención integral');

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockReferral.referredById,
        type: 'REFERRAL_STATUS_CHANGED',
        referralId: mockReferral.id,
      }),
    );
  });

  it('debe lanzar ReferralNotFoundError si la derivación no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('invalid-id', 'RECIBIDO', 'user-1')).rejects.toThrow(ReferralNotFoundError);
  });

  it('debe lanzar ReferralClosedError si la derivación ya está CERRADO', async () => {
    const closedReferral = { ...mockReferral, status: 'CERRADO' as const };
    repository.findById.mockResolvedValue(closedReferral);

    await expect(useCase.execute('ref-123', 'EN_ATENCION', 'user-1')).rejects.toThrow(ReferralClosedError);
  });

  it('debe lanzar ClosureNotesRequiredError al marcar como ATENDIDO sin observaciones', async () => {
    repository.findById.mockResolvedValue(mockReferral);

    await expect(useCase.execute('ref-123', 'ATENDIDO', 'user-1', '')).rejects.toThrow(ClosureNotesRequiredError);
    await expect(useCase.execute('ref-123', 'ATENDIDO', 'user-1', '   ')).rejects.toThrow(ClosureNotesRequiredError);
  });

  it('debe lanzar ClosureNotesRequiredError al marcar como CERRADO sin observaciones', async () => {
    repository.findById.mockResolvedValue(mockReferral);

    await expect(useCase.execute('ref-123', 'CERRADO', 'user-1')).rejects.toThrow(ClosureNotesRequiredError);
  });

  it('debe lanzar un error si el estado enviado no es válido', async () => {
    await expect(useCase.execute('ref-123', 'ESTADO_INVALIDO', 'user-1')).rejects.toThrow("Estado 'ESTADO_INVALIDO' no es válido");
  });
});
