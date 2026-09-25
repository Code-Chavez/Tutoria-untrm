import PDFDocument from 'pdfkit';
import { ReferralConstancia } from '@application/dtos/referral.dto';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Servicio de Psicopedagogía',
  PSICOLOGIA: 'Servicio de Psicología',
  ASISTENCIA_SOCIAL: 'Servicio de Asistencia Social',
  SALUD: 'Servicio de Salud',
};

// Constancia de derivación (HU-28, Anexo N°6). No persiste nada; recibe los
// datos ya resueltos por GetReferralConstanciaUseCase.
export class ReferralConstanciaPdf {
  build(data: ReferralConstancia): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Constancia de Derivación', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#555').text('Anexo N° 6 · Art. 21 del Protocolo de Tutoría', {
        align: 'center',
      });
      doc.moveDown(1.2);

      doc.fillColor('#000').fontSize(11);
      doc.text(`Tutorado: ${data.studentName} · ${data.studentCode}`);
      doc.text(`Escuela profesional: ${data.schoolName} · Ciclo ${data.cycle}`);
      doc.text(`Docente tutor que deriva: ${data.referredByName}`);
      doc.text(
        `Fecha de derivación: ${data.createdAt.toLocaleDateString('es-PE', { dateStyle: 'long' })}`,
      );
      doc.moveDown(1);

      doc.fontSize(12).text('Aspectos observados', { underline: true });
      doc.moveDown(0.4);
      if (data.aspects.length === 0) {
        doc.fontSize(10).fillColor('#555').text('No se marcó ningún aspecto.');
      } else {
        let currentCategory = '';
        data.aspects.forEach((aspect) => {
          if (aspect.category !== currentCategory) {
            currentCategory = aspect.category;
            doc.moveDown(0.3);
            doc.fontSize(10.5).fillColor('#0B1F3F').text(currentCategory, { underline: false });
          }
          doc.fontSize(10).fillColor('#000').text(`• ${aspect.label}`);
        });
      }
      doc.moveDown(1);

      doc.fontSize(12).fillColor('#000').text('Motivo de la derivación', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).text(data.reason);
      doc.moveDown(1);

      doc.fontSize(12).text('Servicio al que se deriva', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).text(SERVICE_LABEL[data.service] ?? data.service);
      if (data.receivingInstance) {
        doc.text(`Instancia o profesional que recibe: ${data.receivingInstance}`);
      }
      doc.moveDown(2);

      doc.fontSize(9).fillColor('#555').text(
        'Documento confidencial: contiene información sensible del tutorado. Su distribución se limita a las personas involucradas en el proceso de derivación (Art. 9.a del Protocolo de Tutoría).',
        { align: 'justify' },
      );
      doc.moveDown(2);

      const lineY = doc.y + 30;
      doc.moveTo(70, lineY).lineTo(250, lineY).stroke();
      doc.moveTo(320, lineY).lineTo(500, lineY).stroke();
      doc.fontSize(9).fillColor('#000');
      doc.text('Profesional que deriva', 70, lineY + 5, { width: 180, align: 'center' });
      doc.text('Profesional que recibe la derivación', 320, lineY + 5, {
        width: 180,
        align: 'center',
      });

      doc.end();
    });
  }
}
