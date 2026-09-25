// Almacenamiento seguro de evidencias de sesión (HU-25): el archivo nunca se
// referencia por un nombre provisto por el usuario, para evitar path
// traversal — la clave de almacenamiento la genera siempre la implementación.
export interface EvidenceStorage {
  /** Guarda el archivo y devuelve la clave para recuperarlo después. */
  save(buffer: Buffer, originalFileName: string): Promise<string>;
  /** Resuelve la ruta absoluta en disco de una clave de almacenamiento. */
  resolvePath(storageKey: string): string;
}
