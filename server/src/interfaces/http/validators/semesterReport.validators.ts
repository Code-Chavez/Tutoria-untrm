import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);

const rowSchema = z.object({
  activity: text(500).min(1, 'Campo obligatorio'),
  achievements: text(2000),
  difficulties: text(2000),
  suggestions: text(2000),
  participants: z.number().int().nonnegative(),
});

// Informe semestral del tutor (HU-43, Anexo N°9). Los datos generales pueden
// quedar en blanco al guardar un avance; las filas sí exigen la actividad.
export const saveSemesterReportSchema = z.object({
  programName: text(300),
  faculty: text(300),
  teacherCategory: text(100),
  tutoringCycles: text(100),
  phone: text(30),
  individual: z.array(rowSchema).max(50),
  group: z.array(rowSchema).max(50),
});

export type SaveSemesterReportBody = z.infer<typeof saveSemesterReportSchema>;
