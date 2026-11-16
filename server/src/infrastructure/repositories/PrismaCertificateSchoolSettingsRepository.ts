import { PrismaClient } from '@prisma/client';
import { CertificateSchoolSettings, CertificateSchoolSettingsRepository } from '@domain/repositories/CertificateSchoolSettingsRepository';

export class PrismaCertificateSchoolSettingsRepository implements CertificateSchoolSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  find(schoolId: string): Promise<CertificateSchoolSettings | null> {
    return this.prisma.certificateSchoolSettings.findUnique({ where: { schoolId }, select: { department: true, signatoryName: true, signatoryRole: true } });
  }

  async save(schoolId: string, values: CertificateSchoolSettings): Promise<void> {
    await this.prisma.certificateSchoolSettings.upsert({ where: { schoolId }, create: { schoolId, ...values }, update: values });
  }
}
