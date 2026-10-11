import { type NextFunction, type Request, type Response } from 'express';

export type FileKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'xlsx';

/** Reconoce el tipo real por los primeros bytes; el tipo MIME declarado lo manda el cliente y no prueba nada. */
export function detectFileKind(buffer: Buffer): FileKind | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'xlsx';
  return null;
}

/**
 * Tras multer: rechaza el archivo cuyo contenido no es de uno de los tipos permitidos (A04/A08).
 * Sin archivo adjunto no hace nada: de eso se ocupa cada controlador.
 */
export function requireFileSignature(allowed: FileKind[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;
    if (!file) {
      next();
      return;
    }
    const kind = detectFileKind(file.buffer);
    if (!kind || !allowed.includes(kind)) {
      res.status(400).json({ error: 'El contenido del archivo no corresponde a un tipo permitido' });
      return;
    }
    next();
  };
}
