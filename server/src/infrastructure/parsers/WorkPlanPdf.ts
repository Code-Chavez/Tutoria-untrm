import { WorkPlanView } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { BrandedPdf } from '../export/BrandedPdf';

const planLabel = (plan: { status: string; revision: number }) =>
  plan.status === 'APROBADO'
    ? ` · Aprobado (revisión ${plan.revision})`
    : plan.status === 'EN_REVISION'
      ? ` · Borrador de revisión ${plan.revision}, pendiente de resolución`
      : ' · Borrador sin resolución de aprobación';

const money = (n: number) => n.toFixed(2);

// Plan de trabajo semestral (HU-41, Anexo N° 8) sobre el motor de exportación
// (HU-46). Recibe la vista ya resuelta y con plan existente.
export class WorkPlanPdf {
  build(view: WorkPlanView & { plan: NonNullable<WorkPlanView['plan']> }): Promise<Buffer> {
    const { plan } = view;
    const budgetTotal = plan.budget.reduce((acc, r) => acc + r.quantity * r.unitCost, 0);

    const pdf = new BrandedPdf({
      title: 'Plan de trabajo para la implementación de la tutoría semestral',
      subtitle: `Anexo N° 8 · ${view.schoolName} · Periodo ${view.periodName}${planLabel(plan)}`,
      generatedAt: plan.updatedAt,
    })
      .heading('I. Introducción')
      .paragraph(plan.introduction)
      .heading('II. Datos generales')
      .keyValues([
        ['2.1 Denominación', plan.denomination],
        ['2.2 Tipo de evento', plan.eventType],
        ['2.3 Fecha de ejecución', plan.executionDate],
        ['2.4 Horario', plan.schedule],
        ['2.5 Lugar', plan.place],
        ['2.6 Modalidad', plan.modality],
        ['2.7 Organizadores', plan.organizers],
        ['2.8 Unidad de apoyo', plan.supportUnit],
      ])
      .heading('III. Fundamentación')
      .paragraph(plan.foundation)
      .heading('IV. Objetivos')
      .keyValues([['Objetivo general', plan.generalObjective]])
      .paragraph('Objetivos específicos')
      .bullets(plan.specificObjectives)
      .heading('V. Público objetivo')
      .paragraph(plan.targetAudience)
      .heading('VI. Metodología')
      .paragraph(plan.methodology)
      .heading('VII. Cronograma')
      .paragraph('Tabla 1. Planificación de actividades')
      .table(
        [{ label: 'Actividad', weight: 4 }, { label: 'Inicio' }, { label: 'Fin' }],
        plan.planning.map((r) => [r.activity, r.startDate, r.endDate]),
      )
      .paragraph('Tabla 2. Programación de actividades')
      .table(
        [{ label: 'Fecha' }, { label: 'Actividad', weight: 3 }, { label: 'Hora' }, { label: 'Lugar', weight: 1.5 }, { label: 'Responsable', weight: 1.5 }],
        plan.programming.map((r) => [r.date, r.activity, r.time, r.place, r.responsible]),
      )
      .heading('VIII. Recursos')
      .paragraph('Tabla 1. Recursos físicos')
      .table(
        [{ label: 'Cant.', align: 'right' }, { label: 'Recurso', weight: 2 }, { label: 'Características', weight: 3 }],
        plan.physicalResources.map((r) => [r.quantity, r.resource, r.characteristics]),
      )
      .paragraph('Tabla 2. Recursos humanos')
      .table(
        [{ label: 'Cant.', align: 'right' }, { label: 'Recurso', weight: 2 }, { label: 'Características', weight: 3 }],
        plan.humanResources.map((r) => [r.quantity, r.resource, r.characteristics]),
      )
      .heading('IX. Presupuesto')
      .table(
        [
          { label: 'Cant.', align: 'right' },
          { label: 'Tipo' },
          { label: 'Recurso', weight: 2 },
          { label: 'Características', weight: 2 },
          { label: 'Costo unit. (S/)', align: 'right' },
          { label: 'Costo total (S/)', align: 'right' },
        ],
        [
          ...plan.budget.map((r) => [r.quantity, r.type, r.resource, r.characteristics, money(r.unitCost), money(r.quantity * r.unitCost)]),
          ['', '', '', 'Total', '', money(budgetTotal)],
        ],
        new Set([plan.budget.length]),
      )
      .heading('X. Otras consideraciones')
      .table(
        [{ label: 'Actividad operativa', weight: 4 }, { label: 'Fecha' }],
        plan.operationalActivities.map((a) => [a.activity, a.date]),
      );

    return pdf.toBuffer();
  }
}
