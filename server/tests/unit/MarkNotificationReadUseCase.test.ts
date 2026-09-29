import { MarkNotificationReadUseCase } from '@application/use-cases/notifications/MarkNotificationReadUseCase';
import { NotificationNotFoundError } from '@application/use-cases/notifications/NotificationErrors';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { Notification } from '@domain/entities/Notification';

describe('MarkNotificationReadUseCase', () => {
  let repository: jest.Mocked<NotificationRepository>;
  let useCase: MarkNotificationReadUseCase;

  const notification: Notification = {
    id: 'n1',
    userId: 'user-1',
    type: 'REFERRAL_STATUS_CHANGED',
    message: 'Tu derivación cambió de estado a "Recibido"',
    referralId: 'ref-1',
    read: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByUser: jest.fn(),
      markRead: jest.fn(),
    };
    useCase = new MarkNotificationReadUseCase(repository);
  });

  it('marca la notificación como leída cuando pertenece al usuario', async () => {
    repository.markRead.mockResolvedValue(notification);

    const result = await useCase.execute('n1', 'user-1');

    expect(repository.markRead).toHaveBeenCalledWith('n1', 'user-1');
    expect(result.read).toBe(true);
  });

  it('lanza NotificationNotFoundError si no existe o no pertenece al usuario', async () => {
    repository.markRead.mockResolvedValue(null);

    await expect(useCase.execute('n1', 'otro-usuario')).rejects.toThrow(NotificationNotFoundError);
  });
});
