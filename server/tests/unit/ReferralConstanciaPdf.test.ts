import { ReferralConstanciaPdf } from '@infrastructure/parsers/ReferralConstanciaPdf';
import { ReferralConstancia } from '@application/dtos/referral.dto';

describe('ReferralConstanciaPdf', () => {
  const builder = new ReferralConstanciaPdf();

  const data: ReferralConstancia = {
    referralId: 'referral-1',
    studentName: 'Ana Torres',
    studentCode: '20191234',
    cycle: 5,
    schoolName: 'Ingeniería de Sistemas',
    referredByName: 'Elena Ramírez',
    reason: 'Bajo rendimiento y señales de ansiedad',
    service: 'PSICOLOGIA',
    receivingInstance: 'Psicóloga Ana García',
    aspects: [
      { category: 'Académicos', label: 'Está en riesgo de repetir algún curso' },
      { category: 'Salud mental', label: 'Se le observa o escucha nervioso/a' },
    ],
    createdAt: new Date('2026-09-25T10:00:00Z'),
  };

  it('genera un buffer PDF válido con los aspectos marcados', async () => {
    const buffer = await builder.build(data);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('genera un buffer PDF válido cuando no se marcó ningún aspecto', async () => {
    const buffer = await builder.build({ ...data, aspects: [] });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('genera un buffer PDF válido sin instancia receptora', async () => {
    const buffer = await builder.build({ ...data, receivingInstance: null });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
