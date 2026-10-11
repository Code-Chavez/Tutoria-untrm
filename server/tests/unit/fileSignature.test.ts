import { type Request, type Response } from 'express';
import { detectFileKind, requireFileSignature } from '../../src/interfaces/http/middleware/fileSignature';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(8)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(4)]);

describe('detectFileKind', () => {
  it.each([
    ['pdf', Buffer.from('%PDF-1.7\n...')],
    ['png', PNG],
    ['jpeg', JPEG],
    ['webp', WEBP],
    ['xlsx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])],
  ])('reconoce %s por su contenido', (kind, buffer) => {
    expect(detectFileKind(buffer as Buffer)).toBe(kind);
  });

  it.each([
    ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['SVG', Buffer.from('<svg onload="alert(1)"/>')],
    ['ejecutable de Windows', Buffer.from('MZ\x90\x00')],
    ['vacío', Buffer.alloc(0)],
    ['PDF truncado', Buffer.from('%PDF')],
  ])('no reconoce %s', (_name, buffer) => {
    expect(detectFileKind(buffer as Buffer)).toBeNull();
  });
});

describe('requireFileSignature', () => {
  const run = (file: Partial<Express.Multer.File> | undefined, allowed: Parameters<typeof requireFileSignature>[0]) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next = jest.fn();
    requireFileSignature(allowed)({ file } as Request, res, next);
    return { res, next };
  };

  it('deja pasar un archivo cuyo contenido es del tipo permitido', () => {
    const { next, res } = run({ buffer: Buffer.from('%PDF-1.4') }, ['pdf']);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza con 400 un contenido que no corresponde, aunque el cliente declare otro tipo', () => {
    const { next, res } = run({ buffer: Buffer.from('<html></html>'), mimetype: 'application/pdf' }, ['pdf', 'png', 'jpeg']);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rechaza un tipo real que no está en la lista (un PNG donde solo se admite PDF)', () => {
    const { next, res } = run({ buffer: PNG }, ['pdf']);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sin archivo no interviene: de eso se ocupa el controlador', () => {
    const { next } = run(undefined, ['pdf']);
    expect(next).toHaveBeenCalled();
  });
});
