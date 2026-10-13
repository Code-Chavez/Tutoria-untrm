import { z } from 'zod';

// III. Motivo de la entrevista — al menos uno debe marcarse (validado en el caso de uso,
// donde el mensaje de error puede referenciar los tres juntos).
export const createInterviewSchema = z
  .object({
    birthDate: z.string().trim().date('Fecha de nacimiento inválida').optional(),
    originPlace: z.string().trim().max(150).optional(),
    age: z.coerce.number().int().min(0).max(120).optional(),
    religion: z.string().trim().max(80).optional(),
    maritalStatus: z.string().trim().max(50).optional(),
    siblingsOrder: z.string().trim().max(50).optional(),
    address: z.string().trim().max(200).optional(),
    admissionYear: z.coerce.number().int().min(1980).optional(),

    motiveAcademic: z.boolean(),
    motivePersonalEmotional: z.boolean(),
    motiveVocational: z.boolean(),
    motiveDetail: z.string().trim().max(1000).optional(),

    aspectsDiscussed: z
      .string()
      .trim()
      .min(3, 'Describa los aspectos tratados o dificultades manifestadas')
      .max(3000, 'Los aspectos tratados son demasiado largos (máximo 3000 caracteres)'),
    agreements: z.string().trim().min(3, 'Describa los acuerdos tomados').max(3000, 'Los acuerdos son demasiado largos (máximo 3000 caracteres)'),
  })
  .superRefine((data, ctx) => {
    const today = new Date();
    if (data.birthDate) {
      const birth = new Date(`${data.birthDate}T00:00:00`);
      if (birth > today) {
        ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'La fecha de nacimiento no puede ser futura' });
      } else if (birth.getFullYear() < 1900) {
        ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'La fecha de nacimiento no es válida' });
      } else if (data.age !== undefined && Math.abs(data.age - ageOn(birth, today)) > 1) {
        // Un año de margen: la edad escrita puede ser la del día de la entrevista o la del cumpleaños próximo.
        ctx.addIssue({ code: 'custom', path: ['age'], message: 'La edad no coincide con la fecha de nacimiento' });
      }
    }
    if (data.admissionYear !== undefined && data.admissionYear > today.getFullYear()) {
      ctx.addIssue({ code: 'custom', path: ['admissionYear'], message: 'El año de ingreso no puede ser posterior al año actual' });
    }
    if (data.birthDate && data.admissionYear !== undefined && data.admissionYear < Number(data.birthDate.slice(0, 4)) + 14) {
      ctx.addIssue({ code: 'custom', path: ['admissionYear'], message: 'El año de ingreso no es coherente con la fecha de nacimiento' });
    }
  });

function ageOn(birth: Date, today: Date): number {
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

export type CreateInterviewBody = z.infer<typeof createInterviewSchema>;
