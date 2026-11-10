import { PrismaClient } from '@prisma/client';
import { CertificateTemplateRecord, CertificateTemplateRepository } from '@domain/repositories/CertificateTemplateRepository';

const SELECT = { id: true, name: true, version: true, isDemo: true, title: true, bodyText: true } as const;

export class PrismaCertificateTemplateRepository implements CertificateTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async update(id: string, values: { title: string; bodyText: string }): Promise<void> {
    await this.prisma.certificateTemplate.update({ where: { id }, data: values });
  }

  ensure(definition: { name: string; version: number; isDemo: boolean; title: string; bodyText: string }): Promise<CertificateTemplateRecord> {
    // `update` vacío: si la plantilla ya existe (y la institución ajustó su título o texto) no se pisa.
    return this.prisma.certificateTemplate.upsert({
      where: { name_version: { name: definition.name, version: definition.version } },
      create: definition,
      update: {},
      select: SELECT,
    });
  }
}
