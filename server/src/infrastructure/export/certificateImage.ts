import PDFDocument from 'pdfkit';
import { inflateSync } from 'node:zlib';

export function isCertificateImage(image: Buffer, kind: 'png' | 'jpeg'): boolean {
  try {
    // PDFKit must be able to read the same bytes that it will later embed.
    const doc = new PDFDocument() as PDFKit.PDFDocument & { openImage(data: Buffer): { width: number; height: number } };
    const { width, height } = doc.openImage(image);
    doc.end();
    if (width < 1 || height < 1 || width > 2000 || height > 2000) return false;
    if (kind === 'jpeg') return image.subarray(-2).equals(Buffer.from([0xff, 0xd9]));

    // Bound decompression and reject incomplete PNGs before they reach PDFKit's asynchronous decoder.
    const chunks: Buffer[] = [];
    for (let offset = 8; offset + 12 <= image.length;) {
      const size = image.readUInt32BE(offset);
      const end = offset + 12 + size;
      if (end > image.length) return false;
      const type = image.toString('ascii', offset + 4, offset + 8);
      if (type === 'IDAT') chunks.push(image.subarray(offset + 8, end - 4));
      if (type === 'IEND') {
        if (image[24] !== 8 || image[28] !== 0) return false;
        const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[image[25] ?? -1];
        if (!channels) return false;
        const stride = width * channels + 1;
        const pixels = inflateSync(Buffer.concat(chunks), { maxOutputLength: stride * height });
        if (pixels.length !== stride * height) return false;
        for (let row = 0; row < height; row++) {
          if (pixels.readUInt8(row * stride) > 4) return false;
        }
        return size === 0 && end === image.length;
      }
      offset = end;
    }
    return false;
  } catch {
    return false;
  }
}
