import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { EvidenceStorage, StoredFileReader } from '@application/ports/EvidenceStorage';

/** Prefijo de las claves guardadas en Cloudinary. Una clave sin él es un archivo anterior, guardado en disco. */
export const CLOUDINARY_KEY_PREFIX = 'cld:';

/** Lo mínimo que se necesita de Cloudinary; permite probar el almacenamiento sin red. */
export interface CloudinaryGateway {
  upload(buffer: Buffer, publicId: string): Promise<void>;
  /** URL firmada y de corta vida para leer desde el servidor un archivo privado. Nunca se entrega al navegador. */
  signedUrl(publicId: string): string;
  destroy(publicId: string): Promise<void>;
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Cloudinary real. Todo se sube como archivo `raw` con entrega `authenticated`: ningún archivo (evidencias, documentos firmados,
 * resoluciones, imágenes) queda accesible por una URL pública; solo el servidor, con su firma, puede leerlo y lo entrega tras las
 * mismas verificaciones de permiso de siempre.
 */
export class CloudinarySdkGateway implements CloudinaryGateway {
  constructor(credentials: CloudinaryCredentials) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  upload(buffer: Buffer, publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: 'raw', type: 'authenticated', overwrite: false, use_filename: false },
        (error) => (error ? reject(error) : resolve()),
      );
      stream.end(buffer);
    });
  }

  signedUrl(publicId: string): string {
    // Descarga por la API (firmada con el secreto y con vencimiento): la entrega por CDN de un activo `authenticated` exige un token
    // que esta cuenta no tiene. El `public_id` de un archivo `raw` ya lleva la extensión, por eso el formato va vacío.
    return cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
  }

  async destroy(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated', invalidate: true });
  }
}

/**
 * Guarda los archivos nuevos en Cloudinary y sigue atendiendo los que ya estaban en disco (claves sin prefijo), para no perder nada
 * al activarlo. La clave la genera siempre este servicio (UUID), nunca el nombre original.
 */
export class CloudinaryEvidenceStorage implements EvidenceStorage, StoredFileReader {
  constructor(
    private readonly gateway: CloudinaryGateway,
    private readonly legacy: EvidenceStorage & StoredFileReader,
    private readonly fetchFile: typeof fetch = fetch,
    private readonly folder = 'sit',
  ) {}

  async save(buffer: Buffer, originalFileName: string): Promise<string> {
    const extension = path.extname(originalFileName).toLowerCase();
    const publicId = `${this.folder}/${randomUUID()}${extension}`;
    await this.gateway.upload(buffer, publicId);
    return `${CLOUDINARY_KEY_PREFIX}${publicId}`;
  }

  /** En Cloudinary devuelve la URL firmada (el controlador la descarga y la reenvía); en disco, la ruta absoluta. */
  resolvePath(storageKey: string): string {
    return this.isRemote(storageKey) ? this.gateway.signedUrl(this.publicId(storageKey)) : this.legacy.resolvePath(storageKey);
  }

  async read(storageKey: string): Promise<Buffer> {
    if (!this.isRemote(storageKey)) return this.legacy.read(storageKey);
    const response = await this.fetchFile(this.gateway.signedUrl(this.publicId(storageKey)));
    if (!response.ok) {
      const error = new Error(`No se pudo leer el archivo (${response.status})`) as NodeJS.ErrnoException;
      if (response.status === 404) error.code = 'ENOENT';
      throw error;
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(storageKey: string): Promise<void> {
    if (!this.isRemote(storageKey)) return this.legacy.delete(storageKey);
    await this.gateway.destroy(this.publicId(storageKey));
  }

  private isRemote(storageKey: string): boolean {
    return storageKey.startsWith(CLOUDINARY_KEY_PREFIX);
  }

  private publicId(storageKey: string): string {
    return storageKey.slice(CLOUDINARY_KEY_PREFIX.length);
  }
}
