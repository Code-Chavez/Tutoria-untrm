import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { env } from '@infrastructure/config/env';

// Guarda las evidencias en disco, fuera del repositorio de código. La clave
// de almacenamiento es siempre un UUID generado aquí (nunca el nombre de
// archivo original) para que un nombre malicioso no pueda escapar la carpeta.
export class LocalEvidenceStorage implements EvidenceStorage {
  private readonly baseDir = path.resolve(process.cwd(), env.EVIDENCE_STORAGE_DIR);

  async save(buffer: Buffer, originalFileName: string): Promise<string> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const extension = path.extname(originalFileName).toLowerCase();
    const storageKey = `${randomUUID()}${extension}`;
    await fs.writeFile(path.join(this.baseDir, storageKey), buffer);
    return storageKey;
  }

  resolvePath(storageKey: string): string {
    return path.join(this.baseDir, storageKey);
  }
}
