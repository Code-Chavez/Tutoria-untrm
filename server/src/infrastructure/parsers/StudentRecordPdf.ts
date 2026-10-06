import { StudentRecord, StudentRecordEvent } from '@application/dtos/studentRecord.dto';
import { BrandedPdf } from '../export/BrandedPdf';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Psicopedagogía',
  PSICOLOGIA: 'Psicología',
  ASISTENCIA_SOCIAL: 'Asistencia social',
  SALUD: 'Salud',
};

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: 'Enviado',
  RECIBIDO: 'Recibido',
  EN_ATENCION: 'En atención',
  ATENDIDO: 'Atendido',
  CERRADO: 'Cerrado',
};

const TYPE_LABEL: Record<StudentRecordEvent['type'], string> = {
  interview: 'Entrevista inicial (Anexo 3)',
  assignment: 'Asignación de tutor',
  attendance: 'Asistencia (Anexo 4)',
  followUp: 'Seguimiento (Anexo 5)',
  referral: 'Derivación (Anexo 6)',
};

function detail(event: StudentRecordEvent): string {
  switch (event.type) {
    case 'interview':
      return [
        `Motivos: ${event.motives.join(', ') || '—'}`,
        `Aspectos tratados: ${event.aspectsDiscussed}`,
        `Acuerdos: ${event.agreements}`,
        `Tutor: ${event.conductedByName}`,
      ].join('\n');
    case 'assignment':
      return `${event.previousTutorName ?? 'Sin tutor previo'} → ${event.newTutorName}. Motivo: ${event.reason}`;
    case 'attendance':
      return `Sesión N° ${event.sequenceNumber}: ${event.topic} (tutor ${event.tutorName})`;
    case 'followUp': {
      const agreement =
        event.instructorName || event.courseName
          ? `Acuerdo con docente ${event.instructorName ?? '—'} (${event.courseName ?? '—'}${event.courseCycle ? `, ciclo ${event.courseCycle}` : ''})`
          : 'Acuerdo con el tutorado';
      return `Motivo: ${event.reason}\n${agreement}: ${event.agreements}\nTutor: ${event.conductedByName}`;
    }
    case 'referral':
      return `${SERVICE_LABEL[event.service] ?? event.service} · ${STATUS_LABEL[event.status] ?? event.status}${event.receivingInstance ? ` · ${event.receivingInstance}` : ''}`;
  }
}

// Expediente del tutorado (HU-16) sobre el motor de exportación (HU-46).
// Reproduce lo mismo que ve el solicitante: la persona de red de apoyo solo
// sale si el rol tenía ese permiso, y la derivación solo en resumen.
export class StudentRecordPdf {
  build(record: StudentRecord): Promise<Buffer> {
    const { student } = record;
    const pdf = new BrandedPdf({
      title: 'Expediente del tutorado',
      subtitle: `${student.firstName} ${student.lastName} · ${student.studentCode}`,
    })
      .heading('Datos del tutorado')
      .keyValues([
        ['Nombre', `${student.firstName} ${student.lastName}`],
        ['Código', student.studentCode],
        ['Escuela profesional', record.schoolName],
        ['Ciclo', student.cycle],
        ['Tutor asignado', record.tutorName],
        ['Estado', student.isActive ? 'Activo' : 'Inactivo'],
        ['En riesgo', student.isAtRisk ? `Sí${student.riskReason ? ` — ${student.riskReason}` : ''}` : 'No'],
      ]);

    if (record.supportContact) {
      const c = record.supportContact;
      pdf.heading('Persona de red de apoyo').keyValues([
        ['Nombre', c.fullName],
        ['Parentesco', c.relationship],
        ['Teléfono', c.phone],
        ['Ocupación', c.occupation],
      ]);
    }

    return pdf
      .heading('Historial')
      .table(
        [{ label: 'Fecha', weight: 1.3 }, { label: 'Tipo', weight: 1.8 }, { label: 'Detalle', weight: 5 }],
        record.timeline.map((e) => [e.date.toLocaleDateString('es-PE'), TYPE_LABEL[e.type], detail(e)]),
      )
      .note('Documento confidencial: contiene información sensible del tutorado (Ley N° 29733).')
      .toBuffer();
  }
}
