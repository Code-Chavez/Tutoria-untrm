import { buildNotificationEmail } from '@application/services/notificationEmail';
import { EmailNotificationRepository } from '@infrastructure/repositories/EmailNotificationRepository';
import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { Mailer } from '@application/ports/Mailer';
import { User } from '@domain/entities/User';

const APP = 'https://sit.ejemplo.edu.pe/';
const recipient = { email: 'elena.ramirez@untrm.edu.pe', firstName: 'Elena' };

const notification = (over: Partial<Notification> = {}): Notification => ({
  id: 'n1',
  userId: 'u1',
  type: 'TUTORING_REQUEST_CREATED',
  // El texto del aviso nombra a la persona: no debe salir por correo.
  message: 'Nueva solicitud de tutoría (Académico) de Ana Torres Ramos',
  referralId: null,
  tutoringRequestId: 'req-1',
  read: false,
  createdAt: new Date(),
  ...over,
});

describe('buildNotificationEmail', () => {
  it('lleva al mismo lugar que la campana según el tipo de aviso', () => {
    expect(buildNotificationEmail(notification(), recipient, APP).text).toContain('https://sit.ejemplo.edu.pe/solicitudes?solicitud=req-1');
    expect(buildNotificationEmail(notification({ type: 'TUTORING_REQUEST_UPDATED' }), recipient, APP).text).toContain('https://sit.ejemplo.edu.pe/solicitar-tutoria');
    expect(buildNotificationEmail(notification({ type: 'REFERRAL_CREATED', referralId: 'ref-1', tutoringRequestId: null }), recipient, APP).text).toContain(
      'https://sit.ejemplo.edu.pe/derivaciones?caso=ref-1',
    );
    expect(buildNotificationEmail(notification({ type: 'REFERRAL_STATUS_CHANGED', referralId: 'ref-1', tutoringRequestId: null }), recipient, APP).subject).toBe(
      'Cambió el estado de una derivación — SIT UNTRM',
    );
  });

  it('no incluye el texto del aviso ni datos de la persona atendida (confidencialidad)', () => {
    const mail = buildNotificationEmail(notification(), recipient, APP);
    expect(mail.to).toBe('elena.ramirez@untrm.edu.pe');
    expect(`${mail.subject}\n${mail.text}`).not.toMatch(/Ana|Torres|Académico/);
    expect(mail.text).toContain('Hola Elena');
    expect(mail.text).toMatch(/no se envía por correo/);
  });
});

describe('EmailNotificationRepository', () => {
  let inner: jest.Mocked<NotificationRepository>;
  let users: jest.Mocked<UserRepository>;
  let mailer: jest.Mocked<Mailer>;
  let logger: { warn: jest.Mock };
  let repo: EmailNotificationRepository;

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    inner = { create: jest.fn().mockResolvedValue(notification()), findByUser: jest.fn(), markAllRead: jest.fn(), markRead: jest.fn() };
    users = { findById: jest.fn().mockResolvedValue({ id: 'u1', ...recipient, isActive: true } as User), findByEmail: jest.fn(), findAll: jest.fn(), create: jest.fn(), update: jest.fn() };
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    logger = { warn: jest.fn() };
    repo = new EmailNotificationRepository(inner, users, mailer, APP, logger);
  });

  it('guarda el aviso y envía el correo a la persona', async () => {
    const created = await repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x', tutoringRequestId: 'req-1' });
    await flush();

    expect(created.id).toBe('n1');
    expect(inner.create).toHaveBeenCalledTimes(1);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'elena.ramirez@untrm.edu.pe' }));
  });

  it('un fallo del correo no afecta al aviso ni a la operación: solo se registra', async () => {
    mailer.send.mockRejectedValue(new Error('SMTP caído'));

    await expect(repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x' })).resolves.toEqual(expect.objectContaining({ id: 'n1' }));
    await flush();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SMTP caído'));
  });

  it('no envía a una cuenta desactivada ni a una sin correo', async () => {
    users.findById.mockResolvedValueOnce({ id: 'u1', ...recipient, isActive: false } as User);
    await repo.sendEmail(notification());
    users.findById.mockResolvedValueOnce({ id: 'u1', email: '', firstName: 'X', isActive: true } as User);
    await repo.sendEmail(notification());
    users.findById.mockResolvedValueOnce(null);
    await repo.sendEmail(notification());

    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('no demora la respuesta: el aviso se devuelve aunque el correo tarde', async () => {
    let release: () => void = () => undefined;
    mailer.send.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));

    const result = await Promise.race([repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x' }), new Promise((r) => setTimeout(() => r('lento'), 500))]);

    expect(result).toEqual(expect.objectContaining({ id: 'n1' }));
    release();
  });

  it('el resto de operaciones pasan al repositorio real', async () => {
    await repo.findByUser('u1', 5);
    await repo.markAllRead('u1');
    await repo.markRead('n1', 'u1');
    expect(inner.findByUser).toHaveBeenCalledWith('u1', 5);
    expect(inner.markAllRead).toHaveBeenCalledWith('u1');
    expect(inner.markRead).toHaveBeenCalledWith('n1', 'u1');
  });
});
