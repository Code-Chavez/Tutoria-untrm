import PDFDocument from 'pdfkit';
import { ScheduleAttendanceReport } from '@application/dtos/report.dto';

const STATUS_LABEL: Record<string, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};

function attendanceLabel(confirmed: boolean | null): string {
  if (confirmed === null) return 'N/A';
  return confirmed ? 'Confirmada' : 'Pendiente';
}

const COLUMNS = [
  { key: 'date', label: 'Fecha', width: 85 },
  { key: 'topic', label: 'Tema', width: 130 },
  { key: 'modality', label: 'Modalidad', width: 60 },
  { key: 'status', label: 'Estado', width: 60 },
  { key: 'attendance', label: 'Asistencia', width: 75 },
] as const;

// Construye el .pdf del consolidado de horarios y asistencia (HU-27, Art.
// 15.d): resumen + tabla de sesiones. No persiste nada; recibe el reporte ya
// calculado por GetScheduleAttendanceReportUseCase.
export class ScheduleAttendanceReportPdf {
  build(report: ScheduleAttendanceReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Consolidado de horarios y asistencia', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#555').text('Anexo N° 5 · Art. 15.d del Protocolo de Tutoría');
      doc.moveDown(1);

      doc.fillColor('#000').fontSize(11);
      doc.text(`Tutor: ${report.tutorName}`);
      const period =
        report.periodFrom || report.periodTo
          ? `${report.periodFrom?.toLocaleDateString('es-PE') ?? '—'} a ${report.periodTo?.toLocaleDateString('es-PE') ?? '—'}`
          : 'Historial completo';
      doc.text(`Periodo: ${period}`);
      doc.text(`Generado: ${report.generatedAt.toLocaleString('es-PE')}`);
      doc.moveDown(0.8);

      doc.fontSize(11).text(
        `Total de sesiones: ${report.totalSessions}  ·  Individuales: ${report.individualSessions}  ·  Grupales: ${report.groupSessions}  ·  Canceladas: ${report.cancelledSessions}`,
      );
      doc.text(
        `Asistencias confirmadas: ${report.attendanceConfirmed}  ·  Asistencias pendientes: ${report.attendancePending}`,
      );
      doc.moveDown(1);

      this.drawTableHeader(doc);
      report.sessions.forEach((s) => {
        this.drawRow(doc, [
          s.scheduledAt.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
          s.topic,
          s.modality === 'PRESENCIAL' ? 'Presencial' : 'Virtual',
          STATUS_LABEL[s.status] ?? s.status,
          attendanceLabel(s.attendanceConfirmed),
        ]);
      });

      if (report.sessions.length === 0) {
        doc.fontSize(10).fillColor('#555').text('Sin sesiones registradas en el periodo.');
      }

      doc.end();
    });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.fontSize(9).fillColor('#fff');
    doc.rect(x, y, COLUMNS.reduce((sum, c) => sum + c.width, 0), 18).fill('#0B1F3F');
    doc.fillColor('#fff');
    COLUMNS.forEach((col) => {
      doc.text(col.label, x + 4, y + 5, { width: col.width - 8 });
      x += col.width;
    });
    doc.y = y + 18;
    doc.fillColor('#000');
  }

  private drawRow(doc: PDFKit.PDFDocument, values: string[]): void {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      this.drawTableHeader(doc);
    }
    const y = doc.y;
    let x = doc.page.margins.left;
    doc.fontSize(8.5).fillColor('#000');
    COLUMNS.forEach((col, i) => {
      doc.text(values[i], x + 4, y + 4, { width: col.width - 8 });
      x += col.width;
    });
    const rowHeight = Math.max(
      16,
      ...COLUMNS.map((col, i) => doc.heightOfString(values[i], { width: col.width - 8 }) + 8),
    );
    doc
      .moveTo(doc.page.margins.left, y + rowHeight)
      .lineTo(doc.page.width - doc.page.margins.right, y + rowHeight)
      .strokeColor('#e0e0e0')
      .stroke();
    doc.y = y + rowHeight;
  }
}
