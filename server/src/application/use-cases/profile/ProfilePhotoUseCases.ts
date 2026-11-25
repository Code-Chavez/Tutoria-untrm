import { UserRepository } from '@domain/repositories/UserRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { ProfileUserNotFoundError } from './ProfileErrors';

export const PROFILE_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const PROFILE_PHOTO_MAX_BYTES = 1024 * 1024;

export class ProfilePhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfilePhotoValidationError';
  }
}

export class ProfilePhotoNotFoundError extends Error {
  constructor() {
    super('No hay una foto de perfil subida');
    this.name = 'ProfilePhotoNotFoundError';
  }
}

/** Sube la foto propia (reemplaza la anterior). La clave la genera el almacenamiento; el contenido ya se verificó en la ruta. */
export class UploadProfilePhotoUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(userId: string, file: { buffer: Buffer; fileName: string; mimeType: string; fileSize: number }): Promise<void> {
    if (!PROFILE_PHOTO_TYPES.includes(file.mimeType)) throw new ProfilePhotoValidationError('La foto debe ser una imagen PNG, JPEG o WebP.');
    if (file.fileSize > PROFILE_PHOTO_MAX_BYTES) throw new ProfilePhotoValidationError('La foto no puede superar 1 MB.');
    const user = await this.users.findById(userId);
    if (!user) throw new ProfileUserNotFoundError();

    const storageKey = await this.storage.save(file.buffer, file.fileName);
    // La foto subida sustituye al enlace anterior: así no hay dos fuentes para la misma foto.
    await this.users.update(userId, { photoStorageKey: storageKey, photoUrl: null });
    if (user.photoStorageKey) await this.storage.delete(user.photoStorageKey);
  }
}

export class RemoveProfilePhotoUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new ProfileUserNotFoundError();
    if (!user.photoStorageKey) return;
    await this.users.update(userId, { photoStorageKey: null });
    await this.storage.delete(user.photoStorageKey);
  }
}

/** Ubicación de la foto propia, para entregarla solo a su dueño. */
export class GetProfilePhotoFileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: EvidenceStorage,
  ) {}

  async execute(userId: string): Promise<{ location: string; mimeType: string }> {
    const user = await this.users.findById(userId);
    if (!user?.photoStorageKey) throw new ProfilePhotoNotFoundError();
    const extension = user.photoStorageKey.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    return { location: this.storage.resolvePath(user.photoStorageKey), mimeType };
  }
}
