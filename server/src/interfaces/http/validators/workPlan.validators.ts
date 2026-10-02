import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1, 'Campo obligatorio').max(max);
const optionalText = (max: number) => z.string().trim().max(max);

// Plan de trabajo semestral (HU-41, Anexo N°8). Las tablas aceptan filas
// vacías de relleno del formulario filtrándolas en el cliente; aquí cada fila
// enviada debe estar completa.
export const saveWorkPlanSchema = z.object({
  introduction: text(5000),
  denomination: text(300),
  eventType: text(200),
  executionDate: text(100),
  schedule: text(100),
  place: text(200),
  modality: text(100),
  organizers: text(300),
  supportUnit: optionalText(300),
  foundation: text(5000),
  generalObjective: text(1000),
  specificObjectives: z.array(text(500)).min(1, 'Indique al menos un objetivo específico').max(20),
  targetAudience: text(1000),
  methodology: text(5000),
  planning: z
    .array(z.object({ activity: text(300), startDate: text(30), endDate: text(30) }))
    .max(50),
  programming: z
    .array(
      z.object({
        date: text(30),
        activity: text(300),
        time: text(50),
        place: text(200),
        responsible: text(200),
      }),
    )
    .max(100),
  physicalResources: z
    .array(
      z.object({
        quantity: z.number().int().positive(),
        resource: text(200),
        characteristics: optionalText(500),
      }),
    )
    .max(100),
  humanResources: z
    .array(
      z.object({
        quantity: z.number().int().positive(),
        resource: text(200),
        characteristics: optionalText(500),
      }),
    )
    .max(100),
  budget: z
    .array(
      z.object({
        quantity: z.number().int().positive(),
        type: text(100),
        resource: text(200),
        characteristics: optionalText(500),
        unitCost: z.number().nonnegative(),
      }),
    )
    .max(100),
  operationalActivities: z.array(z.object({ activity: text(300), date: optionalText(30) })).max(30),
});

export type SaveWorkPlanBody = z.infer<typeof saveWorkPlanSchema>;
