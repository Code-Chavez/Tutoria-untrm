import { CertificateText } from '@domain/certification/certificateDocument';

/** Dibuja el certificado ya compuesto. La implementación solo coloca el texto en la página; no decide su contenido. */
export interface CertificatePdfRenderer {
  render(text: CertificateText): Promise<Buffer>;
}
