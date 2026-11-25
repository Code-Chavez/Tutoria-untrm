import { Response } from 'express';

interface Options {
  /** Nombre con el que se descarga. Sin él, el archivo se muestra en línea (p. ej. el logotipo). */
  fileName?: string;
  mimeType?: string;
}

/**
 * Entrega un archivo guardado. `location` es lo que devuelve `EvidenceStorage.resolvePath`: una ruta en disco o, para los archivos de
 * Cloudinary, una URL firmada. En ese caso el servidor la descarga y la reenvía, así la URL firmada nunca llega al navegador y el
 * permiso se sigue comprobando aquí.
 */
export async function sendStoredFile(res: Response, location: string, options: Options = {}): Promise<void> {
  const { fileName, mimeType } = options;
  if (!/^https:\/\//i.test(location)) {
    if (fileName) res.download(location, fileName);
    else res.sendFile(location);
    return;
  }
  const remote = await fetch(location);
  if (!remote.ok) {
    res.status(remote.status === 404 ? 404 : 502).json({ error: 'No se pudo obtener el archivo' });
    return;
  }
  if (fileName) res.attachment(fileName);
  if (mimeType) res.setHeader('Content-Type', mimeType);
  res.send(Buffer.from(await remote.arrayBuffer()));
}
