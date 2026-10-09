import ExcelJS from 'exceljs';
import { EvaluationStatisticsPdf, EvaluationStatisticsWorkbook } from '@infrastructure/parsers/EvaluationStatisticsExports';
import { IndicatorsPdf, IndicatorsWorkbook } from '@infrastructure/parsers/IndicatorsExports';
import { WorkPlanPdf } from '@infrastructure/parsers/WorkPlanPdf';
import { StudentRecordPdf } from '@infrastructure/parsers/StudentRecordPdf';
import { SemesterReportPdf } from '@infrastructure/parsers/SemesterReportPdf';
import { ConsolidatedReportPdf } from '@infrastructure/parsers/ConsolidatedReportPdf';
import { ConsolidatedReportWorkbook } from '@infrastructure/parsers/ConsolidatedReportWorkbook';
import { EvaluationStatisticsReport } from '@application/dtos/evaluation.dto';
import { StudentRecord } from '@application/dtos/studentRecord.dto';
import { IndicatorsReport } from '@application/use-cases/indicators/buildIndicators';
import { ConsolidatedMetrics, ConsolidatedReport } from '@application/use-cases/consolidated-reports/buildConsolidatedReport';
import { PublicWorkPlan } from '@application/use-cases/work-plans/toPublicWorkPlan';
import { SemesterReportExport } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';

const isPdf = (b: Buffer) => b.subarray(0, 5).toString() === '%PDF-';
const load = async (b: Buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(b as unknown as ArrayBuffer);
  return wb;
};

const evaluation: EvaluationStatisticsReport = {
  periodName: '2026-II',
  appliedFilters: [],
  tutors: [
    {
      tutorId: 't1',
      tutorName: 'Elena Ramírez',
      totalResponses: 4,
      overallAverage: 4.3333,
      items: [
        { code: '01', label: 'Actitud', average: 4.5 },
        { code: '02', label: 'Confianza', average: 4 },
      ],
    },
  ],
};

const indicators: IndicatorsReport = {
  periodName: '2026-II',
  generatedAt: new Date('2026-10-06T10:00:00Z'),
  students: { active: 40, withTutor: 30, withoutTutor: 10, assignedPct: 75 },
  risk: { atRisk: 8, atRiskPct: 20, bySchool: [{ schoolId: 's', schoolName: 'Sistemas', active: 25, atRisk: 5 }] },
  sessions: { individual: 12, group: 3, total: 15, studentsServed: 24, coveragePct: 60, byMonth: [{ month: '2026-09', individual: 12, group: 3 }] },
  referrals: { total: 6, byService: [{ service: 'PSICOLOGIA', count: 4 }], byStatus: [{ status: 'ENVIADO', count: 6 }] },
  evaluation: { responses: 9, averageScore: null },
  appliedFilters: [],
};

const metrics = (over: Partial<ConsolidatedMetrics> = {}): ConsolidatedMetrics => ({
  activeStudents: 10, studentsWithTutor: 8, coveragePct: 80, tutors: 2, sessionsIndividual: 5, sessionsGroup: 1,
  sessionsTotal: 6, participants: 7, participationPct: 70, reportsSubmitted: 1, reportsPct: 50,
  avgStudentsPerTutor: 4, avgSessionsPerTutor: 3, ...over,
});

const consolidated: ConsolidatedReport = {
  periodName: '2026-II',
  generatedAt: new Date('2026-10-06T10:00:00Z'),
  totals: metrics({ activeStudents: 99 }),
  faculties: [{ facultyId: 'f1', facultyName: 'Ingeniería', metrics: metrics(), schools: [{ schoolId: 's', schoolName: 'Sistemas', metrics: metrics() }] }],
  appliedFilters: [],
};

describe('Exportadores sobre el motor de marca (HU-46)', () => {
  it('estadísticas de evaluación: PDF y Excel con promedio por tutor y por ítem', async () => {
    expect(isPdf(await new EvaluationStatisticsPdf().build(evaluation))).toBe(true);

    const wb = await load(await new EvaluationStatisticsWorkbook().build(evaluation));
    const averages = wb.getWorksheet('Promedios')!;
    expect(averages.getCell('A7').value).toBe('Elena Ramírez');
    expect(averages.getCell('C7').value).toBe(4.33);
    const items = wb.getWorksheet('Por ítem')!;
    expect(items.getCell('B6').value).toBe('Ítem 01');
    expect(items.getCell('C7').value).toBe(4);
  });

  it('estadísticas de evaluación: no incluye ningún dato del tutorado', async () => {
    const wb = await load(await new EvaluationStatisticsWorkbook().build(evaluation));
    const text = JSON.stringify(wb.worksheets.map((s) => s.getSheetValues()));
    expect(text).not.toMatch(/student|tutorado/i);
  });

  it('indicadores: PDF y Excel con una hoja por bloque', async () => {
    expect(isPdf(await new IndicatorsPdf().build(indicators))).toBe(true);

    const wb = await load(await new IndicatorsWorkbook().build(indicators));
    expect(wb.worksheets.map((s) => s.name)).toEqual([
      'Indicadores',
      'Sesiones por mes',
      'Derivaciones por servicio',
      'Derivaciones por estado',
      'Riesgo por escuela',
    ]);
    const kpis = wb.getWorksheet('Indicadores')!;
    expect(kpis.getCell('A7').value).toBe('Tutorados activos');
    expect(kpis.getCell('B7').value).toBe(40);
    expect(wb.getWorksheet('Derivaciones por servicio')!.getCell('A7').value).toBe('Psicología');
  });

  it('consolidado migrado: Excel con subtotal de facultad y total general resaltados', async () => {
    const wb = await load(await new ConsolidatedReportWorkbook().build(consolidated));
    const sheet = wb.getWorksheet('Consolidado')!;
    expect(sheet.getCell('B7').value).toBe('Sistemas');
    expect(sheet.getCell('B8').value).toBe('Total facultad');
    expect(sheet.getRow(8).font?.bold).toBe(true);
    expect(sheet.getCell('A9').value).toBe('TOTAL GENERAL');
    expect(isPdf(await new ConsolidatedReportPdf().build(consolidated))).toBe(true);
  });

  it('informe semestral: PDF con tablas individual y grupal', async () => {
    const data = {
      periodName: '2026-II',
      tutorName: 'Elena Ramírez',
      report: {
        programName: 'Sistemas', faculty: 'Ingeniería', teacherCategory: 'Asociado', tutoringCycles: '1, 3', phone: '941',
        individual: [{ activity: 'Hábitos', achievements: 'Mejoró', difficulties: '', suggestions: '', participants: 2 }],
        group: [], updatedAt: new Date(),
      },
    } as unknown as SemesterReportExport;
    expect(isPdf(await new SemesterReportPdf().build(data))).toBe(true);
  });

  it('plan de trabajo: PDF del Anexo 8 con presupuesto y total', async () => {
    const plan = {
      introduction: 'Intro', denomination: 'Taller', eventType: 'Taller', executionDate: '2026-10-20', schedule: '9:00', place: 'Aula',
      modality: 'Presencial', organizers: 'Escuela', supportUnit: '', foundation: 'F', generalObjective: 'G', specificObjectives: ['a', 'b'],
      targetAudience: 'Todos', methodology: 'M',
      planning: [{ activity: 'A', startDate: '2026-10-01', endDate: '2026-10-05' }],
      programming: [{ date: '2026-10-20', activity: 'A', time: '9:00', place: 'Aula', responsible: 'Tutor' }],
      physicalResources: [{ quantity: 1, resource: 'Proyector', characteristics: '' }],
      humanResources: [{ quantity: 2, resource: 'Tutores', characteristics: '' }],
      budget: [{ quantity: 2, type: 'Bien', resource: 'Papel', characteristics: '', unitCost: 10 }],
      operationalActivities: [{ activity: 'Ejecución', date: '2026-10-20' }],
      inForce: true, updatedAt: new Date(),
    } as unknown as PublicWorkPlan;
    const pdf = await new WorkPlanPdf().build({ periodName: '2026-II', schoolName: 'Sistemas', plan });
    expect(isPdf(pdf)).toBe(true);
  });

  it('expediente: PDF con todos los tipos de evento y red de apoyo opcional', async () => {
    const date = new Date('2026-09-10T10:00:00Z');
    const record = {
      student: { id: 's', studentCode: '2020', firstName: 'Ana', lastName: 'Torres', cycle: 3, isActive: true, isAtRisk: true, riskReason: 'Bajo rendimiento' },
      schoolName: 'Sistemas',
      tutorName: 'Elena Ramírez',
      supportContact: { fullName: 'María Torres', relationship: 'Madre', phone: '999', occupation: null },
      timeline: [
        { type: 'interview', id: '1', date, conductedByName: 'Elena', motives: ['Académica'], aspectsDiscussed: 'x', agreements: 'y' },
        { type: 'assignment', id: '2', date, previousTutorName: null, newTutorName: 'Elena', reason: 'Inicio' },
        { type: 'attendance', id: '3', date, sequenceNumber: 1, topic: 'Hábitos', tutorName: 'Elena', scheduledAt: date },
        { type: 'followUp', id: '4', date, reason: 'r', agreements: 'a', instructorName: null, courseName: null, courseCycle: null, conductedByName: 'Elena' },
        { type: 'referral', id: '5', date, service: 'PSICOLOGIA', status: 'ENVIADO', receivingInstance: null },
      ],
    } as unknown as StudentRecord;
    expect(isPdf(await new StudentRecordPdf().build(record))).toBe(true);
    expect(isPdf(await new StudentRecordPdf().build({ ...record, supportContact: undefined }))).toBe(true);
  });
});
