import { EmailOutboxProcessor, MAX_ATTEMPTS, RETRY_DELAYS_MINUTES, LEASE_MS } from '@application/services/EmailOutboxProcessor';
import { EmailOutboxWorker } from '@infrastructure/services/EmailOutboxWorker';
import { EmailOutboxRepository, OutboxItem } from '@domain/repositories/EmailOutboxRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { Mailer } from '@application/ports/Mailer';
import { Notification } from '@domain/entities/Notification';
import { User } from '@domain/entities/User';

const NOW = new Date('2026-10-15T12:00:00Z');
const notification = { id: 'n1', userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'Nueva solicitud de Ana Torres', read: false, createdAt: NOW, tutoringRequestId: 'req-1' } as Notification;
const item = (attempts = 0): OutboxItem => ({ id: 'o1', attempts, notification });

describe('EmailOutboxProcessor (A10)', () => {
  let outbox: jest.Mocked<EmailOutboxRepository>;
  let users: jest.Mocked<UserRepository>;
  let mailer: jest.Mocked<Mailer>;
  let logger: { warn: jest.Mock; error: jest.Mock };
  let processor: EmailOutboxProcessor;

  beforeEach(() => {
    outbox = {
      enqueue: jest.fn(),
      claimDue: jest.fn().mockResolvedValue([]),
      claimForNotification: jest.fn().mockResolvedValue(item()),
      markSent: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      markSkipped: jest.fn().mockResolvedValue(undefined),
      countByStatus: jest.fn(),
    };
    users = { findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'elena@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez', isActive: true } as User) } as unknown as jest.Mocked<UserRepository>;
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    logger = { warn: jest.fn(), error: jest.fn() };
    processor = new EmailOutboxProcessor(outbox, users, mailer, 'https://sit.example.test', logger, () => NOW);
  });

  it('envía y marca como enviado solo después de que el SMTP aceptó', async () => {
    await processor.processNotification('n1');

    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'elena@untrm.edu.pe' }));
    expect(outbox.markSent).toHaveBeenCalledWith('o1', NOW);
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it('el correo enviado no incluye el texto del aviso (confidencialidad)', async () => {
    await processor.processNotification('n1');

    const sent = mailer.send.mock.calls[0][0];
    expect(`${sent.subject}${sent.text}${sent.html}`).not.toMatch(/Ana|Torres/);
  });

  it('un fallo del SMTP programa el reintento con espera creciente y no lanza', async () => {
    mailer.send.mockRejectedValue(new Error('SMTP caído'));

    await expect(processor.processNotification('n1')).resolves.toBeUndefined();

    expect(outbox.markSent).not.toHaveBeenCalled();
    expect(outbox.markFailed).toHaveBeenCalledWith('o1', 1, 'SMTP caído', new Date(NOW.getTime() + RETRY_DELAYS_MINUTES[0] * 60_000));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('se reintenta en 1 min'));
  });

  it.each(RETRY_DELAYS_MINUTES.map((minutes, index) => [index + 1, minutes]))('tras el fallo %i espera %i min', async (failures, minutes) => {
    outbox.claimForNotification.mockResolvedValue(item(failures - 1));
    mailer.send.mockRejectedValue(new Error('x'));

    await processor.processNotification('n1');

    expect(outbox.markFailed).toHaveBeenCalledWith('o1', failures, 'x', new Date(NOW.getTime() + minutes * 60_000));
  });

  it('al agotar los intentos lo da por fallido (sin más reintentos) y lo registra como error', async () => {
    outbox.claimForNotification.mockResolvedValue(item(MAX_ATTEMPTS - 1));
    mailer.send.mockRejectedValue(new Error('rechazado'));

    await processor.processNotification('n1');

    expect(outbox.markFailed).toHaveBeenCalledWith('o1', MAX_ATTEMPTS, 'rechazado', null);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no se pudo entregar'));
    expect(logger.error.mock.calls[0][0]).not.toMatch(/Ana|Torres|elena@/); // sin datos de la persona ni del caso
  });

  it('no envía a una cuenta desactivada ni sin correo: la entrada se omite sin reintentos', async () => {
    users.findById.mockResolvedValueOnce({ id: 'u1', email: 'x@untrm.edu.pe', isActive: false } as User);
    await processor.processNotification('n1');
    users.findById.mockResolvedValueOnce(null);
    await processor.processNotification('n1');

    expect(mailer.send).not.toHaveBeenCalled();
    expect(outbox.markSkipped).toHaveBeenCalledTimes(2);
  });

  it('si otro proceso ya tomó la entrada, no envía (sin duplicar)', async () => {
    outbox.claimForNotification.mockResolvedValue(null);

    await processor.processNotification('n1');

    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('processNotification nunca lanza, ni siquiera si falla la base', async () => {
    outbox.claimForNotification.mockRejectedValue(new Error('base caída'));

    await expect(processor.processNotification('n1')).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('base caída'));
  });

  it('processDue atiende las entradas vencidas y devuelve cuántas', async () => {
    outbox.claimDue.mockResolvedValue([item(1), { ...item(0), id: 'o2' }]);

    const count = await processor.processDue(10);

    expect(count).toBe(2);
    expect(outbox.claimDue).toHaveBeenCalledWith(NOW, 10, LEASE_MS);
    expect(mailer.send).toHaveBeenCalledTimes(2);
  });
});

describe('EmailOutboxWorker', () => {
  it('reintenta lo pendiente en cada vuelta y no se solapa consigo mismo', async () => {
    let release: () => void = () => undefined;
    const processDue = jest.fn().mockImplementation(() => new Promise<number>((resolve) => (release = () => resolve(0))));
    const worker = new EmailOutboxWorker({ processDue } as unknown as EmailOutboxProcessor);

    const first = worker.tick();
    await worker.tick(); // mientras la primera sigue en curso, esta no hace nada
    expect(processDue).toHaveBeenCalledTimes(1);

    processDue.mockResolvedValue(0);
    release();
    await first;
    await worker.tick();
    expect(processDue).toHaveBeenCalledTimes(2);
  });

  it('un fallo no detiene al proceso de fondo', async () => {
    const processDue = jest.fn().mockRejectedValueOnce(new Error('base caída')).mockResolvedValue(0);
    const logger = { error: jest.fn() };
    const worker = new EmailOutboxWorker({ processDue } as unknown as EmailOutboxProcessor, 1000, logger);

    await worker.tick();
    await worker.tick();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(processDue).toHaveBeenCalledTimes(2);
  });
});
