import { GetNotificationsUseCase } from '@application/use-cases/notifications/GetNotificationsUseCase';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { Notification } from '@domain/entities/Notification';

describe('GetNotificationsUseCase', () => {
  it('devuelve las notificaciones del usuario autenticado', async () => {
    const notifications: Notification[] = [
      {
        id: 'n1',
        userId: 'user-1',
        type: 'REFERRAL_CREATED',
        message: 'Nueva derivación recibida en Servicio de Psicología',
        referralId: 'ref-1',
        read: false,
        createdAt: new Date(),
      },
    ];
    const repository: jest.Mocked<NotificationRepository> = {
      create: jest.fn(),
      findByUser: jest.fn().mockResolvedValue(notifications),
      markRead: jest.fn(),
    };

    const useCase = new GetNotificationsUseCase(repository);
    const result = await useCase.execute('user-1');

    expect(repository.findByUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(notifications);
  });
});
