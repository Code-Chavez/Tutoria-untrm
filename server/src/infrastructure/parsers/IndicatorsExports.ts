import { IndicatorsReport } from '@application/use-cases/indicators/buildIndicators';
import { BrandedPdf, PdfCell } from '../export/BrandedPdf';
import { BrandedWorkbook, SheetCell } from '../export/BrandedWorkbook';

const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela',
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

/** Indicadores clave en filas indicador/valor, comunes al PDF y al Excel. */
function summaryRows(r: IndicatorsReport): [string, string | number][] {
  return [
    ['Tutorados activos', r.students.active],
    ['Tutorados con tutor asignado', r.students.withTutor],
    ['Tutorados sin tutor', r.students.withoutTutor],
    ['Asignación de tutor (%)', r.students.assignedPct],
    ['Sesiones realizadas', r.sessions.total],
    ['Sesiones individuales', r.sessions.individual],
    ['Sesiones grupales', r.sessions.group],
    ['Tutorados atendidos', r.sessions.studentsServed],
    ['Cobertura de sesiones (%)', r.sessions.coveragePct],
    ['Tutorados en riesgo', r.risk.atRisk],
    ['Tutorados en riesgo (%)', r.risk.atRiskPct],
    ['Derivaciones del periodo', r.referrals.total],
    ['Respuestas de evaluación', r.evaluation.responses],
    ['Promedio de evaluación (1-5)', r.evaluation.averageScore ?? '—'],
  ];
}

const serviceRows = (r: IndicatorsReport) =>
  r.referrals.byService.map((s) => [SERVICE_LABEL[s.service] ?? s.service, s.count]);
const statusRows = (r: IndicatorsReport) =>
  r.referrals.byStatus.map((s) => [STATUS_LABEL[s.status] ?? s.status, s.count]);
const riskRows = (r: IndicatorsReport) =>
  r.risk.bySchool.map((s) => [s.schoolName, s.active, s.atRisk]);
const monthRows = (r: IndicatorsReport) =>
  r.sessions.byMonth.map((m) => [m.month, m.individual, m.group, m.individual + m.group]);

// Tablero de indicadores (HU-45) sobre el motor de exportación (HU-46).
export class IndicatorsPdf {
  build(report: IndicatorsReport): Promise<Buffer> {
    const pair = [{ label: 'Indicador', weight: 4 }, { label: 'Valor', weight: 1, align: 'right' as const }];
    const count = (label: string) => [{ label, weight: 4 }, { label: 'Cantidad', weight: 1, align: 'right' as const }];
    return new BrandedPdf({
      title: 'Tablero de indicadores de tutoría',
      subtitle: [`Periodo ${report.periodName}`, ...report.appliedFilters, 'ICACIT / SINEACE'].join(' · '),
      generatedAt: report.generatedAt,
    })
      .heading('Indicadores clave')
      .table(pair, summaryRows(report))
      .heading('Sesiones por mes')
      .table(
        [
          { label: 'Mes', weight: 2 },
          { label: 'Individuales', align: 'right' },
          { label: 'Grupales', align: 'right' },
          { label: 'Total', align: 'right' },
        ],
        monthRows(report) as PdfCell[][],
      )
      .heading('Derivaciones por servicio')
      .table(count('Servicio'), serviceRows(report))
      .heading('Derivaciones por estado')
      .table(count('Estado'), statusRows(report))
      .heading('Tutorados en riesgo por escuela')
      .table(
        [{ label: 'Escuela', weight: 3 }, { label: 'Activos', align: 'right' }, { label: 'En riesgo', align: 'right' }],
        riskRows(report),
      )
      .toBuffer();
  }
}

export class IndicatorsWorkbook {
  build(report: IndicatorsReport): Promise<Buffer> {
    const details = [
      `Periodo ${report.periodName}`,
      ...(report.appliedFilters.length > 0 ? [`Filtros: ${report.appliedFilters.join(' · ')}`] : []),
      `Generado: ${report.generatedAt.toLocaleString('es-PE')}`,
    ];
    const sheet = (name: string, title: string, columns: { header: string; width?: number }[], rows: SheetCell[][]) => ({
      name,
      title,
      details,
      columns,
      rows,
    });
    return new BrandedWorkbook(report.generatedAt)
      .addSheet(sheet('Indicadores', 'Indicadores clave', [{ header: 'Indicador', width: 38 }, { header: 'Valor', width: 14 }], summaryRows(report)))
      .addSheet(
        sheet(
          'Sesiones por mes',
          'Sesiones por mes',
          [{ header: 'Mes', width: 14 }, { header: 'Individuales', width: 14 }, { header: 'Grupales', width: 14 }, { header: 'Total', width: 12 }],
          monthRows(report),
        ),
      )
      .addSheet(sheet('Derivaciones por servicio', 'Derivaciones por servicio', [{ header: 'Servicio', width: 30 }, { header: 'Cantidad', width: 12 }], serviceRows(report)))
      .addSheet(sheet('Derivaciones por estado', 'Derivaciones por estado', [{ header: 'Estado', width: 30 }, { header: 'Cantidad', width: 12 }], statusRows(report)))
      .addSheet(
        sheet(
          'Riesgo por escuela',
          'Tutorados en riesgo por escuela',
          [{ header: 'Escuela', width: 36 }, { header: 'Activos', width: 12 }, { header: 'En riesgo', width: 12 }],
          riskRows(report),
        ),
      )
      .toBuffer();
  }
}
