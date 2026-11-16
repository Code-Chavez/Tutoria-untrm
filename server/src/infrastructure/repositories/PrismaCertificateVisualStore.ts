import { PrismaClient } from '@prisma/client';
import { CertificateVisualStore } from '@application/use-cases/certification/CertificateVisualSettings';

export class PrismaCertificateVisualStore implements CertificateVisualStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list(keys: string[]) {
    const assets = await this.prisma.certificateVisualAsset.findMany({ where: { key: { in: keys } }, select: { key: true } });
    return assets.map(({ key }) => key);
  }

  async read(keys: string[]) {
    const assets = await this.prisma.certificateVisualAsset.findMany({ where: { key: { in: keys } } });
    return new Map(assets.map(({ key, content }) => [key, Buffer.from(content)]));
  }

  async save(key: string, image: Buffer | null, actor: string, ip?: string) {
    await this.prisma.$transaction(async (tx) => {
      if (image) {
        const content = new Uint8Array(image);
        await tx.certificateVisualAsset.upsert({ where: { key }, create: { key, content }, update: { content } });
      } else {
        await tx.certificateVisualAsset.deleteMany({ where: { key } });
      }
      await tx.auditLog.create({ data: { userId: actor, action: image ? 'CERTIFICATE_ASSET_SAVED' : 'CERTIFICATE_ASSET_REMOVED', entity: 'CertificateVisualAsset', entityId: key, ipAddress: ip } });
    });
  }
}
