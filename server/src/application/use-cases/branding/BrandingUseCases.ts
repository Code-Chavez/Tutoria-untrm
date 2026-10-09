import { BrandingSettings, DEFAULT_BRANDING } from '@domain/entities/BrandingSettings';
import { BrandingRepository, BrandingTexts } from '@domain/repositories/BrandingRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { contrastRatio, MIN_TEXT_CONTRAST } from './colorContrast';

export class BrandingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrandingValidationError';
  }
}

export class BrandingLogoNotFoundError extends Error {
  constructor() {
    super('No hay un logotipo personalizado');
    this.name = 'BrandingLogoNotFoundError';
  }
}

/** Lo que consume la interfaz: nunca expone la clave interna de almacenamiento. */
export interface BrandingView {
  institutionName: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  hasCustomLogo: boolean;
  /** Para invalidar la caché del logotipo al cambiarlo; null con la identidad por defecto. */
  updatedAt: Date | null;
}

const toView = (s: BrandingSettings): BrandingView => ({
  institutionName: s.institutionName,
  shortName: s.shortName,
  primaryColor: s.primaryColor,
  accentColor: s.accentColor,
  hasCustomLogo: s.logoStorageKey !== null,
  updatedAt: s.updatedAt,
});

/** Identidad vigente (la configurada o, si no hay, la UNTRM por defecto). Es pública: la usa la pantalla de login. */
export class GetBrandingUseCase {
  constructor(private readonly branding: BrandingRepository) {}

  async execute(): Promise<BrandingView> {
    return toView((await this.branding.find()) ?? DEFAULT_BRANDING);
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Cambia nombres y colores (HU-50). El color principal lleva texto blanco
 * encima, así que se exige contraste AA; un color muy claro dejaría ilegible
 * la barra lateral y los botones.
 */
export class UpdateBrandingUseCase {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, input: BrandingTexts): Promise<BrandingView> {
    const data: BrandingTexts = {
      institutionName: input.institutionName.trim(),
      shortName: input.shortName.trim(),
      primaryColor: input.primaryColor.toUpperCase(),
      accentColor: input.accentColor.toUpperCase(),
    };
    if (!data.institutionName || !data.shortName) {
      throw new BrandingValidationError('El nombre de la institución y el nombre corto son obligatorios');
    }
    if (!HEX.test(data.primaryColor) || !HEX.test(data.accentColor)) {
      throw new BrandingValidationError('Los colores deben tener el formato #RRGGBB');
    }
    const ratio = contrastRatio(data.primaryColor, '#FFFFFF');
    if (ratio < MIN_TEXT_CONTRAST) {
      throw new BrandingValidationError(
        `El color principal es demasiado claro: el texto blanco sobre él no se leería bien (contraste ${ratio.toFixed(1)}:1, mínimo ${MIN_TEXT_CONTRAST}:1). Elige un tono más oscuro.`,
      );
    }

    const current = (await this.branding.find()) ?? DEFAULT_BRANDING;
    const saved = await this.branding.save(data);
    await this.auditLogs.create({
      userId: requesterId,
      action: 'UPDATE_BRANDING',
      entity: 'BrandingSetting',
      entityId: 'default',
      details: `${current.primaryColor}/${current.accentColor} → ${data.primaryColor}/${data.accentColor}`,
      ipAddress: null,
    });
    return toView(saved);
  }
}

const LOGO_MAX_BYTES = 1024 * 1024;

// Se comprueba la firma del archivo, no solo el tipo declarado: evita subir otro
// formato (p. ej. SVG con scripts) disfrazado de imagen.
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

export interface LogoUpload {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

/** Sube el logotipo personalizado (PNG, JPEG o WebP de hasta 1 MB) y descarta el anterior. */
export class UploadBrandingLogoUseCase {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly storage: EvidenceStorage,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, file: LogoUpload): Promise<BrandingView> {
    const matches = SIGNATURES[file.mimeType];
    if (!matches) throw new BrandingValidationError('El logotipo debe ser una imagen PNG, JPEG o WebP');
    if (file.buffer.length > LOGO_MAX_BYTES) throw new BrandingValidationError('El logotipo no puede superar 1 MB');
    if (!matches(file.buffer)) throw new BrandingValidationError('El archivo no es una imagen válida del tipo indicado');

    const previous = await this.branding.find();
    const storageKey = await this.storage.save(file.buffer, file.fileName);
    const saved = await this.branding.setLogo(storageKey, file.mimeType);
    if (previous?.logoStorageKey) await this.storage.delete(previous.logoStorageKey);

    await this.auditLogs.create({
      userId: requesterId,
      action: 'UPDATE_BRANDING_LOGO',
      entity: 'BrandingSetting',
      entityId: 'default',
      details: `${file.mimeType}, ${file.buffer.length} bytes`,
      ipAddress: null,
    });
    return toView(saved);
  }
}

/** Quita el logotipo personalizado y vuelve al institucional. */
export class RemoveBrandingLogoUseCase {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly storage: EvidenceStorage,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string): Promise<void> {
    const current = await this.branding.find();
    if (!current?.logoStorageKey) return;
    await this.branding.clearLogo();
    await this.storage.delete(current.logoStorageKey);
    await this.auditLogs.create({
      userId: requesterId, action: 'REMOVE_BRANDING_LOGO', entity: 'BrandingSetting', entityId: 'default', details: null, ipAddress: null,
    });
  }
}

/** Restablece la identidad UNTRM por defecto (colores, nombres y logotipo). */
export class ResetBrandingUseCase {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly storage: EvidenceStorage,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string): Promise<BrandingView> {
    const current = await this.branding.find();
    await this.branding.reset();
    if (current?.logoStorageKey) await this.storage.delete(current.logoStorageKey);
    await this.auditLogs.create({
      userId: requesterId, action: 'RESET_BRANDING', entity: 'BrandingSetting', entityId: 'default', details: null, ipAddress: null,
    });
    return toView(DEFAULT_BRANDING);
  }
}

/** Ruta en disco del logotipo personalizado para servirlo (público: lo usa el login). */
export class GetBrandingLogoFileUseCase {
  constructor(
    private readonly branding: BrandingRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(): Promise<{ absolutePath: string; mimeType: string }> {
    const current = await this.branding.find();
    if (!current?.logoStorageKey || !current.logoMimeType) throw new BrandingLogoNotFoundError();
    return { absolutePath: this.storage.resolvePath(current.logoStorageKey), mimeType: current.logoMimeType };
  }
}
