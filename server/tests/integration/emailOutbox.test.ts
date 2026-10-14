import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaEmailOutboxRepository } from '../../src/infrastructure/repositories/PrismaEmailOutboxRepository';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { EmailOutboxProcessor, LEASE_MS } from '../../src/application/services/EmailOutboxProcessor';
import { Mailer } from '../../src/application/ports/Mailer';

/**
 * Cola de correos (A10) contra la base de datos real: una sola toma por entrada aunque dos procesos compitan, el fallo
 * del SMTP deja la entrada para el reintento, y el éxito la cierra. Usa un aviso propio de la prueba (su borrado arrastra
 * la entrada). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(60_000);

describe('cola de correos con la base real (A10)', () => {
  const outbox = new PrismaEmailOutboxRepository(prisma);
  let dbUp = false;
  let notificationId = '';

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de la cola de correos.');
    }
  });

  beforeEach(async () => {
    if (!dbUp) return;
    const user = await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } });
    const created = await prisma.notification.create({ data: { userId: user.id, type: 'REFERRAL_STATUS_CHANGED', message: 'prueba A10' } });
    notificationId = created.id;
    await outbox.enqueue(notificationId);
  });

  afterEach(async () => {
    if (dbUp && notificationId) await prisma.notification.deleteMany({ where: { id: notificationId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('encolar dos veces deja una sola entrada', async () => {
    if (!dbUp) return;
    await outbox.enqueue(notificationId);

    expect(await prisma.emailOutbox.count({ where: { notificationId } })).toBe(1);
  });

  it('dos procesos que compiten por la misma entrada: solo uno la toma', async () => {
    if (!dbUp) return;
    const now = new Date();
    const [a, b] = await Promise.all([outbox.claimForNotification(notificationId, now, LEASE_MS), outbox.claimForNotification(notificationId, now, LEASE_MS)]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('mientras está apartada no se ofrece a los reintentos; al vencer el plazo vuelve a estar disponible', async () => {
    if (!dbUp) return;
    const now = new Date();
    await outbox.claimForNotification(notificationId, now, LEASE_MS);

    const during = await outbox.claimDue(new Date(now.getTime() + 60_000), 50, LEASE_MS);
    expect(during.find((i) => i.notification.id === notificationId)).toBeUndefined();

    const after = await outbox.claimDue(new Date(now.getTime() + LEASE_MS + 1000), 50, LEASE_MS);
    expect(after.find((i) => i.notification.id === notificationId)).toBeDefined();
  });

  it('un fallo del SMTP deja el correo pendiente con su error; el reintento exitoso lo cierra', async () => {
    if (!dbUp) return;
    const failing: Mailer = { send: jest.fn().mockRejectedValue(new Error('SMTP caído')) };
    const quietLogger = { warn: jest.fn(), error: jest.fn() };
    const users = new PrismaUserRepository(prisma);

    await new EmailOutboxProcessor(outbox, users, failing, 'https://sit.example.test', quietLogger).processNotification(notificationId);
    const afterFailure = await prisma.emailOutbox.findUniqueOrThrow({ where: { notificationId } });
    expect(afterFailure).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'SMTP caído' });
    expect(afterFailure.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    // El SMTP vuelve: el proceso de fondo, pasado el plazo del reintento, lo entrega.
    const working: Mailer = { send: jest.fn().mockResolvedValue(undefined) };
    const later = new Date(Date.now() + 2 * 60_000);
    const processor = new EmailOutboxProcessor(outbox, users, working, 'https://sit.example.test', quietLogger, () => later);
    await processor.processDue(500);

    const afterRetry = await prisma.emailOutbox.findUniqueOrThrow({ where: { notificationId } });
    expect(afterRetry.status).toBe('SENT');
    expect(afterRetry.sentAt).not.toBeNull();
    expect(working.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'elena.ramirez@untrm.edu.pe' }));
  });
});
