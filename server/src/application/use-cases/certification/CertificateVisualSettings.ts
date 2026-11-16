import { CertificateForbiddenError, CertificateScopeResolver } from './CertificateQueryUseCases';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';

export const certificateAssetKinds = ['universityLogo', 'facultyLogo', 'watermark', 'signature'] as const;
export type CertificateAssetKind = (typeof certificateAssetKinds)[number];
export type CertificateVisuals = Partial<Record<CertificateAssetKind, Buffer>>;

export interface CertificateVisualStore {
  list(keys: string[]): Promise<string[]>;
  read(keys: string[]): Promise<Map<string, Buffer>>;
  save(key: string, image: Buffer | null, actor: string, ip?: string): Promise<void>;
}

function assetKeys(schoolId: string, facultyId: string, actor: string): Record<CertificateAssetKind, string> {
  return {
    universityLogo: 'universityLogo',
    facultyLogo: `facultyLogo:${facultyId}`,
    watermark: `watermark:${facultyId}`,
    signature: `signature:${schoolId}:${actor}`,
  };
}

export class CertificateVisualSettings {
  constructor(
    private readonly scope: CertificateScopeResolver,
    private readonly schools: SchoolRepository,
    private readonly store: CertificateVisualStore,
  ) {}

  private async access(actor: string, schoolId: string, permissions: string[]) {
    const scope = await this.scope.resolve(actor);
    const school = await this.schools.findById(schoolId);
    if (!school || (scope.kind === 'SCHOOLS' && !scope.schoolIds.includes(schoolId))) throw new CertificateForbiddenError();
    const branding = scope.kind === 'ALL' && permissions.includes('branding:manage');
    return {
      keys: assetKeys(schoolId, school.facultyId, actor),
      allowed: {
        universityLogo: branding,
        facultyLogo: branding,
        watermark: branding,
        signature: permissions.includes('certificados:emitir'),
      },
    };
  }

  async status(actor: string, schoolId: string, permissions: string[]) {
    const { keys, allowed } = await this.access(actor, schoolId, permissions);
    const present = await this.store.list(Object.values(keys));
    return certificateAssetKinds.map((kind) => ({ kind, configured: present.includes(keys[kind]), editable: allowed[kind] }));
  }

  async save(actor: string, schoolId: string, permissions: string[], kind: CertificateAssetKind, image: Buffer | null, ip?: string) {
    const { keys, allowed } = await this.access(actor, schoolId, permissions);
    if (!allowed[kind]) throw new CertificateForbiddenError();
    await this.store.save(keys[kind], image, actor, ip);
  }

  async forDocument(actor: string, schoolId: string, facultyId: string): Promise<CertificateVisuals> {
    const keys = assetKeys(schoolId, facultyId, actor);
    const images = await this.store.read(Object.values(keys));
    return Object.fromEntries(certificateAssetKinds.map((kind) => [kind, images.get(keys[kind])]));
  }
}
