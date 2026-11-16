// Almacenamiento seguro de evidencias de sesión (HU-25): el archivo nunca se
// referencia por un nombre provisto por el usuario, para evitar path
// traversal — la clave de almacenamiento la genera siempre la implementación.
export interface EvidenceStorage {
  /** Guarda el archivo y devuelve la clave para recuperarlo después. */
  save(buffer: Buffer, originalFileName: string): Promise<string>;
  /** Resuelve la ruta absoluta en disco de una clave de almacenamiento. */
  resolvePath(storageKey: string): string;
  /** Elimina el archivo (p. ej. al reemplazar el logotipo); no falla si ya no existe. */
  delete(storageKey: string): Promise<void>;
}

/**
 * Lectura del contenido guardado. Va aparte para quien necesita los bytes (p. ej. verificar la huella de un PDF antes de entregarlo,
 * sobre los mismos bytes que se envían) sin obligar a los demás a implementarla.
 */
export interface StoredFileReader {
  /** El contenido; lanza un error con código ENOENT si ya no existe. */
  read(storageKey: string): Promise<Buffer>;
}
