import { PrismaClient } from '@prisma/client';
import { BrandingSettings, DEFAULT_BRANDING } from '@domain/entities/BrandingSettings';
import { BrandingRepository, BrandingTexts } from '@domain/repositories/BrandingRepository';

const ID = 'default';

export class PrismaBrandingRepository implements BrandingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  find(): Promise<BrandingSettings | null> {
    return this.prisma.brandingSetting.findUnique({ where: { id: ID } });
  }

  save(data: BrandingTexts): Promise<BrandingSettings> {
    return this.prisma.brandingSetting.upsert({
      where: { id: ID },
      update: data,
      create: { id: ID, ...data },
    });
  }

  setLogo(storageKey: string, mimeType: string): Promise<BrandingSettings> {
    return this.prisma.brandingSetting.upsert({
      where: { id: ID },
      update: { logoStorageKey: storageKey, logoMimeType: mimeType },
      create: {
        id: ID,
        institutionName: DEFAULT_BRANDING.institutionName,
        shortName: DEFAULT_BRANDING.shortName,
        primaryColor: DEFAULT_BRANDING.primaryColor,
        accentColor: DEFAULT_BRANDING.accentColor,
        logoStorageKey: storageKey,
        logoMimeType: mimeType,
      },
    });
  }

  async clearLogo(): Promise<void> {
    await this.prisma.brandingSetting.updateMany({
      where: { id: ID },
      data: { logoStorageKey: null, logoMimeType: null },
    });
  }

  async reset(): Promise<void> {
    await this.prisma.brandingSetting.deleteMany({ where: { id: ID } });
  }
}
