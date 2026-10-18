import { buildNotificationEmail } from '@application/services/notificationEmail';
import { EmailNotificationRepository } from '@infrastructure/repositories/EmailNotificationRepository';
import { Notification } from '@domain/entities/Notification';
import { NotificationRepository } from '@domain/repositories/NotificationRepository';
import { EmailOutboxRepository } from '@domain/repositories/EmailOutboxRepository';
import { EmailOutboxProcessor } from '@application/services/EmailOutboxProcessor';

const APP = 'https://sit.ejemplo.edu.pe/';
const recipient = { email: 'elena.ramirez@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez Chávez' };

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
      'Actualización del estado de una derivación — SIT UNTRM',
    );
  });

  it('los avisos de sesión llevan a «Mis sesiones» y su correo solo avisa: ni fecha, ni lugar, ni motivo', () => {
    const base = { userId: 'u1', referralId: null, tutoringRequestId: null, sessionId: 'ses-1', read: false, createdAt: new Date() };
    const cases: [Notification['type'], string][] = [
      ['SESSION_SCHEDULED', 'Sesión de tutoría programada'],
      ['SESSION_RESCHEDULED', 'Cambio en su sesión de tutoría'],
      ['SESSION_CANCELLED', 'Su sesión de tutoría fue cancelada'],
    ];
    for (const [type, subject] of cases) {
      const mail = buildNotificationEmail({ id: 'n', type, message: 'Lugar: Aula 204. Motivo: Enfermedad del tutor', ...base }, recipient, APP);
      expect(mail.subject).toContain(subject);
      expect(mail.text).toContain('https://sit.ejemplo.edu.pe/mis-sesiones');
      expect(mail.text + mail.html).not.toMatch(/Aula 204|Enfermedad/);
    }
  });

  it('no incluye el texto del aviso ni datos de la persona atendida (confidencialidad)', () => {
    const mail = buildNotificationEmail(notification(), recipient, APP);
    expect(mail.to).toBe('elena.ramirez@untrm.edu.pe');
    expect(`${mail.subject}\n${mail.text}`).not.toMatch(/Ana|Torres|Académico/);
    expect(mail.text).toContain('Estimado(a) Elena Ramírez Chávez:');
    expect(mail.text).toMatch(/no se envía por correo electrónico/);
  });

  it('es un correo formal: saludo, firma institucional, aviso de mensaje automático y versión HTML', () => {
    const mail = buildNotificationEmail(notification(), recipient, APP);
    expect(mail.text).toContain('Atentamente,');
    expect(mail.text).toContain('Dirección de Bienestar Universitario');
    expect(mail.text).toContain('Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas');
    expect(mail.text).toMatch(/mensaje automático/);
    expect(mail.html).toContain('href="https://sit.ejemplo.edu.pe/solicitudes?solicitud=req-1"');
    expect(mail.html).toContain('Ingresar al sistema');
    expect(mail.html).not.toMatch(/Ana|Torres|Académico/);
  });

  it('en el HTML escapa el nombre de la persona', () => {
    const mail = buildNotificationEmail(notification(), { email: 'x@untrm.edu.pe', firstName: '<b>Elena</b>', lastName: '"O\'Brien" & Co' }, APP);
    expect(mail.html).toContain('&lt;b&gt;Elena&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Elena</b>');
  });

  it('la constancia de la solicitud registrada confirma al tutorado y lo lleva a «Solicitar tutoría»', () => {
    const mail = buildNotificationEmail(notification({ type: 'TUTORING_REQUEST_RECEIVED' }), recipient, APP);
    expect(mail.subject).toBe('Solicitud de tutoría registrada — SIT UNTRM');
    expect(mail.text).toMatch(/ha sido registrada en el sistema/);
    expect(mail.text).toContain('https://sit.ejemplo.edu.pe/solicitar-tutoria');
  });
});

describe('EmailNotificationRepository', () => {
  let inner: jest.Mocked<NotificationRepository>;
  let outbox: jest.Mocked<EmailOutboxRepository>;
  let processor: { processNotification: jest.Mock };
  let logger: { warn: jest.Mock };
  let repo: EmailNotificationRepository;

  beforeEach(() => {
    inner = { create: jest.fn().mockResolvedValue(notification()), findByUser: jest.fn(), markAllRead: jest.fn(), markRead: jest.fn() };
    outbox = { enqueue: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<EmailOutboxRepository>;
    processor = { processNotification: jest.fn().mockResolvedValue(undefined) };
    logger = { warn: jest.fn() };
    repo = new EmailNotificationRepository(inner, outbox, processor as unknown as EmailOutboxProcessor, logger);
  });

  it('guarda el aviso, encola su correo y dispara el primer intento de envío', async () => {
    const created = await repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x', tutoringRequestId: 'req-1' });

    expect(created.id).toBe('n1');
    expect(inner.create).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith('n1');
    expect(processor.processNotification).toHaveBeenCalledWith('n1');
  });

  it('no demora la respuesta: el aviso se devuelve aunque el envío tarde', async () => {
    processor.processNotification.mockReturnValue(new Promise(() => undefined));

    const result = await Promise.race([repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x' }), new Promise((r) => setTimeout(() => r('lento'), 500))]);

    expect(result).toEqual(expect.objectContaining({ id: 'n1' }));
  });

  it('si no se puede encolar, el aviso igual se guarda y la operación no falla', async () => {
    outbox.enqueue.mockRejectedValue(new Error('base caída'));

    await expect(repo.create({ userId: 'u1', type: 'TUTORING_REQUEST_CREATED', message: 'x' })).resolves.toEqual(expect.objectContaining({ id: 'n1' }));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('base caída'));
    expect(processor.processNotification).not.toHaveBeenCalled();
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
