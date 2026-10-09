import { MarkAllNotificationsReadUseCase } from '@application/use-cases/notifications/MarkAllNotificationsReadUseCase';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';

describe('MarkAllNotificationsReadUseCase (R03)', () => {
  it('marca como leídos los avisos del usuario autenticado y devuelve cuántos eran', async () => {
    const repository = {
      create: jest.fn(),
      findByUser: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn().mockResolvedValue(3),
    } as jest.Mocked<NotificationRepository>;

    const updated = await new MarkAllNotificationsReadUseCase(repository).execute('user-1');

    expect(repository.markAllRead).toHaveBeenCalledWith('user-1');
    expect(updated).toBe(3);
  });
});
