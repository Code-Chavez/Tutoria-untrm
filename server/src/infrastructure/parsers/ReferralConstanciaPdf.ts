import { ReferralConstancia } from '@application/dtos/referral.dto';
import { BrandedPdf } from '../export/BrandedPdf';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Servicio de Psicopedagogía',
  PSICOLOGIA: 'Servicio de Psicología',
  ASISTENCIA_SOCIAL: 'Servicio de Asistencia Social',
  SALUD: 'Servicio de Salud',
};

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: 'Enviada',
  RECIBIDO: 'Recibida',
  EN_ATENCION: 'En atención',
  ATENDIDO: 'Atendida',
  CERRADO: 'Cerrada',
};

// Constancia de derivación (HU-28, Anexo N°6) sobre el motor de exportación (HU-46). No persiste nada;
// recibe los datos ya resueltos por GetReferralConstanciaUseCase. Se imprime, la firman a mano el profesional
// que deriva y quien recibe, y el escaneo se adjunta a la derivación (A14); el sistema no sustituye la firma.
export class ReferralConstanciaPdf {
  build(data: ReferralConstancia): Promise<Buffer> {
    const pdf = new BrandedPdf({
      title: 'Constancia de Derivación',
      subtitle: `Anexo N° 6 · Art. 21 del Protocolo de Tutoría · Código ${data.referralId.slice(0, 8).toUpperCase()}`,
      generatedAt: data.createdAt,
    })
      .heading('I. Datos del tutorado')
      .keyValues([
        ['Apellidos y nombres', data.studentName],
        ['Código de matrícula', data.studentCode],
        ['Facultad', data.facultyName],
        ['Escuela profesional', data.schoolName],
        ['Ciclo', String(data.cycle)],
        ['Correo electrónico', data.studentEmail ?? '—'],
        ['Teléfono', data.studentPhone ?? '—'],
        ['Docente tutor asignado', data.tutorName],
      ])
      .heading('II. Datos de la derivación')
      .keyValues([
        ['Profesional que deriva', data.referredByName],
        ['Correo del profesional', data.referredByEmail ?? '—'],
        ['Fecha de derivación', data.createdAt.toLocaleDateString('es-PE', { dateStyle: 'long' })],
        ['Estado actual', STATUS_LABEL[data.status] ?? data.status],
      ])
      .heading('III. Aspectos observados');

    if (data.aspects.length === 0) {
      pdf.note('No se marcó ningún aspecto.');
    } else {
      const categories = [...new Set(data.aspects.map((a) => a.category))];
      categories.forEach((category) => {
        pdf.paragraph(category);
        pdf.bullets(data.aspects.filter((a) => a.category === category).map((a) => a.label));
      });
    }

    pdf.heading('IV. Motivo de la derivación').paragraph(data.reason);
    pdf.heading('V. Servicio al que se deriva').paragraph(SERVICE_LABEL[data.service] ?? data.service);
    if (data.receivingInstance) {
      pdf.keyValues([['Instancia o profesional que recibe', data.receivingInstance]]);
    }

    return pdf
      .heading('VI. Conformidad')
      .note(
        'Imprima este documento, fírmelo y adjunte el escaneo en la derivación del sistema. El registro en pantalla no reemplaza las firmas.',
      )
      .signatureLine(`Firma y sello del profesional que deriva — ${data.referredByName}`)
      .signatureLine(`Firma y sello del profesional que recibe${data.receivingInstance ? ` — ${data.receivingInstance}` : ''}`)
      .note(
        'Documento confidencial: contiene información sensible del tutorado. Su distribución se limita a las personas involucradas en el proceso de derivación (Art. 9.a del Protocolo de Tutoría).',
      )
      .toBuffer();
  }
}
