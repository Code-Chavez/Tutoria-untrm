import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { PrismaCertificateSequenceRepository } from '../../src/infrastructure/repositories/PrismaCertificateSequenceRepository';
import { DEMO_SEQUENCE_SCOPE } from '../../src/domain/certification/certificateNumber';

/**
 * Modelo de datos de la certificación del docente tutor (corte 1) sobre la base real: la numeración es atómica aunque varias
 * emisiones coincidan, no se consume si la transacción se revierte, y las reglas que no deben depender de la aplicación (estados
 * válidos, demostración sin firma ni entrega, prefijo DEMO-, un trámite vigente por docente, anulado con motivo) las impone la
 * base. Usa un periodo propio y un ámbito de numeración propio, y los borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const stamp = String(Date.now());
const scope = `TEST-${stamp}`;
const YEAR = 2026;

describe('certificación del docente tutor: modelo de datos (corte 1)', () => {
  let dbUp = false;
  let periodId = '';
  let schoolId = '';
  let tutorId = '';
  let adminId = '';
  const certificateIds: string[] = [];
  let seq = 0;

  const nextInTx = (s: string, year = YEAR) => prisma.$transaction((tx) => new PrismaCertificateSequenceRepository(tx).next(s, year));
  const uniqueNumber = () => `DEMO-${stamp}-${(seq += 1)}`;
  const create = async (data: Record<string, unknown> = {}) => {
    const row = await prisma.certificate.create({
      data: { periodId, schoolId, tutorId, createdById: adminId, ...data } as never,
    });
    certificateIds.push(row.id);
    return row;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba del modelo de certificación.');
      return;
    }
    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba certificación ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    schoolId = (await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } })).id;
    tutorId = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
  });

  afterAll(async () => {
    if (!dbUp) return;
    await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
    await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
    await prisma.committeeResolution.deleteMany({ where: { periodId } });
    await prisma.certificateSequence.deleteMany({ where: { scope: { startsWith: `TEST-${stamp}` } } });
    await prisma.academicPeriod.delete({ where: { id: periodId } });
    await prisma.$disconnect();
  });

  const guard = (fn: () => Promise<void>) => async () => {
    if (!dbUp) return;
    await fn();
  };

  describe('numeración transaccional', () => {
    it('veinte emisiones simultáneas del mismo ámbito y año reciben números distintos y seguidos', guard(async () => {
      const numbers = await Promise.all(Array.from({ length: 20 }, () => nextInTx(scope)));
      expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    }));

    it('cada ámbito y cada año llevan su propia cuenta', guard(async () => {
      expect(await nextInTx(`${scope}-otro`)).toBe(1);
      expect(await nextInTx(scope, YEAR + 1)).toBe(1);
      expect(await nextInTx(scope)).toBe(21);
    }));

    it('si la transacción se revierte, el número no se consume', guard(async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          expect(await new PrismaCertificateSequenceRepository(tx).next(scope, YEAR)).toBe(22);
          throw new Error('se revierte');
        }),
      ).rejects.toThrow('se revierte');
      expect(await nextInTx(scope)).toBe(22);
    }));

    it('el ámbito de demostración es independiente de cualquier otro', guard(async () => {
      expect(DEMO_SEQUENCE_SCOPE).toBe('DEMO');
      expect(DEMO_SEQUENCE_SCOPE).not.toBe(scope);
    }));

    it('el contador no admite valores negativos', guard(async () => {
      await expect(prisma.certificateSequence.create({ data: { scope: `${scope}-neg`, year: YEAR, last: -1 } })).rejects.toThrow(/certificate_sequences_last_check/);
    }));
  });

  describe('restricciones impuestas por la base', () => {
    it('un trámite nuevo nace INICIADO, de demostración y sin número', guard(async () => {
      const row = await create();
      expect(row).toMatchObject({ status: 'INICIADO', isDemo: true, number: null });
      await prisma.certificate.update({ where: { id: row.id }, data: { status: 'ANULADO', voidReason: 'prueba', voidedById: adminId } });
    }));

    it('rechaza un estado que no existe', guard(async () => {
      await expect(create({ status: 'INVENTADO' })).rejects.toThrow(/certificates_status_check/);
    }));

    it('un certificado de demostración no puede estar pendiente de firma, firmado ni entregado', guard(async () => {
      for (const status of ['PENDIENTE_DE_FIRMA', 'FIRMADO_INCORPORADO', 'ENTREGADO']) {
        await expect(create({ status, isDemo: true })).rejects.toThrow(/certificates_demo_no_signature_check/);
      }
    }));

    it('el número lleva el prefijo DEMO- si y solo si el certificado es de demostración', guard(async () => {
      await expect(create({ isDemo: true, number: `001-2026/UNTRM/FAC-ESC-${stamp}` })).rejects.toThrow(/certificates_number_demo_prefix_check/);
      await expect(create({ isDemo: false, number: uniqueNumber() })).rejects.toThrow(/certificates_number_demo_prefix_check/);
    }));

    it('el número de registro no se repite', guard(async () => {
      const number = uniqueNumber();
      const first = await create({ number, status: 'ANULADO', voidReason: 'prueba', voidedById: adminId });
      await expect(create({ number, status: 'ANULADO', voidReason: 'prueba', voidedById: adminId })).rejects.toThrow(/Unique constraint|certificates_number_key/);
      expect(first.number).toBe(number);
    }));

    it('solo hay un trámite vigente por docente, escuela y periodo; uno anulado no lo impide', guard(async () => {
      const first = await create();
      await expect(create()).rejects.toThrow(/Unique constraint|certificates_one_active_per_tutor_key/);
      await prisma.certificate.update({ where: { id: first.id }, data: { status: 'ANULADO', voidReason: 'se inicia de nuevo', voidedById: adminId } });
      const second = await create();
      expect(second.id).not.toBe(first.id);
      await prisma.certificate.update({ where: { id: second.id }, data: { status: 'RECHAZADO' } });
      await expect(create()).resolves.toBeDefined();
    }));

    it('anular exige motivo y quién anula', guard(async () => {
      await expect(create({ status: 'ANULADO' })).rejects.toThrow(/certificates_void_reason_check/);
      await expect(create({ status: 'ANULADO', voidReason: 'sin responsable' })).rejects.toThrow(/certificates_void_reason_check/);
    }));

    it('la conformidad de una evidencia solo admite los resultados definidos y nace pendiente', guard(async () => {
      const certificate = await create({ status: 'ANULADO', voidReason: 'prueba', voidedById: adminId });
      const evidence = await prisma.certificateEvidence.create({ data: { certificateId: certificate.id, kind: 'ACEPTACION' } });
      expect(evidence.result).toBe('PENDIENTE');
      await expect(prisma.certificateEvidence.create({ data: { certificateId: certificate.id, kind: 'SESIONES', result: 'CUMPLIO' } })).rejects.toThrow(/certificate_evidences_result_check/);
    }));

    it('hay una sola resolución de decanato por escuela y periodo', guard(async () => {
      const data = { periodId, schoolId, number: `000-2026-DEMO-${stamp}`, issuedOn: new Date('2026-03-01'), createdById: adminId };
      await prisma.committeeResolution.create({ data });
      await expect(prisma.committeeResolution.create({ data: { ...data, number: `001-2026-DEMO-${stamp}` } })).rejects.toThrow(/Unique constraint|committee_resolutions_period_id_school_id_key/);
    }));
  });
});
