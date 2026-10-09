import { createHash } from 'node:crypto';
import { SignedDocument, SignedDocumentView } from '@domain/entities/SignedDocument';
import { UserRepository } from '@domain/repositories/UserRepository';

export const sha256Of = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

/** Un documento firmado sin su clave de almacenamiento y con el nombre de quien lo adjuntó. */
export async function toSignedDocumentViews(
  documents: SignedDocument[],
  users: UserRepository,
): Promise<SignedDocumentView[]> {
  const names = new Map<string, string>();
  for (const id of new Set(documents.map((d) => d.uploadedById))) {
    const user = await users.findById(id);
    names.set(id, user ? `${user.firstName} ${user.lastName}` : 'Desconocido');
  }
  return documents.map(({ storageKey: _storageKey, ...rest }) => ({
    ...rest,
    uploadedByName: names.get(rest.uploadedById) ?? 'Desconocido',
  }));
}
