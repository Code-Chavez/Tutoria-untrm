import { AttendanceSheet } from '@application/use-cases/signed-documents/AttendanceSheetUseCases';
import { BrandedPdf } from '../export/BrandedPdf';

const ROWS = 8; // Anexo N°4: ocho filas por tutoría individual y semestre.
const MODALITY: Record<string, string> = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual' };

// Hoja de asistencia a la tutoría individual (Anexo N°4) sobre el motor de exportación. Las sesiones con
// asistencia ya confirmada salen numeradas; las filas restantes quedan en blanco. La columna «Firma del
// tutorado» se llena a mano y el escaneo firmado se adjunta al tutorado (A14): marcar la asistencia en el
// sistema no equivale a la firma del estudiante.
export class AttendanceSheetPdf {
  build(sheet: AttendanceSheet): Promise<Buffer> {
    const rows = Array.from({ length: ROWS }, (_, i) => {
      const session = sheet.rows.find((r) => r.sequenceNumber === i + 1);
      return session
        ? [
            String(i + 1),
            session.date.toLocaleDateString('es-PE', { dateStyle: 'short' }),
            session.topic,
            MODALITY[session.modality] ?? session.modality,
            '',
          ]
        : [String(i + 1), '', '', '', ''];
    });

    return new BrandedPdf({
      title: 'Hoja de asistencia a la tutoría individual',
      subtitle: `Anexo N° 4 · Periodo ${sheet.periodName}`,
      generatedAt: sheet.generatedAt,
    })
      .keyValues([
        ['Apellidos y nombres del tutorado', sheet.student.name],
        ['Código de matrícula', sheet.student.code],
        ['Facultad', sheet.facultyName],
        ['Escuela profesional', sheet.schoolName],
        ['Ciclo', String(sheet.student.cycle)],
        ['Correo electrónico', sheet.student.email ?? '—'],
        ['Teléfono', sheet.student.phone ?? '—'],
        ['Docente tutor', sheet.tutorName],
      ])
      .heading('Sesiones')
      .table(
        [
          { label: 'N°' },
          { label: 'Fecha' },
          { label: 'Tema', weight: 3 },
          { label: 'Modalidad', weight: 1.4 },
          { label: 'Firma del tutorado', weight: 2 },
        ],
        rows,
      )
      .note(
        'Imprima la hoja, haga firmar cada sesión al tutorado y al docente tutor, y adjunte el escaneo en el expediente del tutorado. La asistencia confirmada en el sistema no reemplaza la firma del estudiante.',
      )
      .signatureLine(`Firma del docente tutor — ${sheet.tutorName}`)
      .toBuffer();
  }
}
