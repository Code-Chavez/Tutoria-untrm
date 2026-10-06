import { ReferralConstancia } from '@application/dtos/referral.dto';
import { BrandedPdf } from '../export/BrandedPdf';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Servicio de Psicopedagogía',
  PSICOLOGIA: 'Servicio de Psicología',
  ASISTENCIA_SOCIAL: 'Servicio de Asistencia Social',
  SALUD: 'Servicio de Salud',
};

// Constancia de derivación (HU-28, Anexo N°6) sobre el motor de exportación
// (HU-46). No persiste nada; recibe los datos ya resueltos por
// GetReferralConstanciaUseCase.
export class ReferralConstanciaPdf {
  build(data: ReferralConstancia): Promise<Buffer> {
    const pdf = new BrandedPdf({
      title: 'Constancia de Derivación',
      subtitle: 'Anexo N° 6 · Art. 21 del Protocolo de Tutoría',
      generatedAt: data.createdAt,
    })
      .keyValues([
        ['Tutorado', `${data.studentName} · ${data.studentCode}`],
        ['Escuela profesional', `${data.schoolName} · Ciclo ${data.cycle}`],
        ['Docente tutor que deriva', data.referredByName],
        ['Fecha de derivación', data.createdAt.toLocaleDateString('es-PE', { dateStyle: 'long' })],
      ])
      .heading('Aspectos observados');

    if (data.aspects.length === 0) {
      pdf.note('No se marcó ningún aspecto.');
    } else {
      const categories = [...new Set(data.aspects.map((a) => a.category))];
      categories.forEach((category) => {
        pdf.paragraph(category);
        pdf.bullets(data.aspects.filter((a) => a.category === category).map((a) => a.label));
      });
    }

    pdf.heading('Motivo de la derivación').paragraph(data.reason);
    pdf.heading('Servicio al que se deriva').paragraph(SERVICE_LABEL[data.service] ?? data.service);
    if (data.receivingInstance) {
      pdf.keyValues([['Instancia o profesional que recibe', data.receivingInstance]]);
    }

    return pdf
      .note(
        'Documento confidencial: contiene información sensible del tutorado. Su distribución se limita a las personas involucradas en el proceso de derivación (Art. 9.a del Protocolo de Tutoría).',
      )
      .toBuffer();
  }
}
