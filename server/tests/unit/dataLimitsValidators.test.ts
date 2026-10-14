import { createInterviewSchema } from '@interfaces/http/validators/interview.validators';
import { upsertSupportContactSchema } from '@interfaces/http/validators/supportContact.validators';
import { updateProfileSchema } from '@interfaces/http/validators/profile.validators';
import { personName, optionalPhone } from '@interfaces/http/validators/fields';

const year = new Date().getFullYear();

const interview = {
  motiveAcademic: true,
  motivePersonalEmotional: false,
  motiveVocational: false,
  aspectsDiscussed: 'Dificultades con el curso de cálculo',
  agreements: 'Reunión semanal',
};

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) => (result.error?.issues ?? []).map((i) => i.message).join(' | ');

describe('entrevista inicial: fechas y edad coherentes (A07)', () => {
  it('acepta una entrevista con fecha de nacimiento, edad y año de ingreso coherentes', () => {
    const result = createInterviewSchema.safeParse({ ...interview, birthDate: `${year - 20}-01-01`, age: 20, admissionYear: year - 2 });

    expect(result.success).toBe(true);
  });

  it('acepta una entrevista sin los datos opcionales', () => {
    expect(createInterviewSchema.safeParse(interview).success).toBe(true);
  });

  it('rechaza una fecha de nacimiento futura', () => {
    const result = createInterviewSchema.safeParse({ ...interview, birthDate: `${year + 1}-01-01` });

    expect(result.success).toBe(false);
    expect(messages(result)).toMatch(/no puede ser futura/);
  });

  it('rechaza una fecha de nacimiento anterior a 1900', () => {
    expect(createInterviewSchema.safeParse({ ...interview, birthDate: '1850-05-05' }).success).toBe(false);
  });

  it('rechaza una edad que no corresponde a la fecha de nacimiento', () => {
    const result = createInterviewSchema.safeParse({ ...interview, birthDate: `${year - 20}-01-01`, age: 45 });

    expect(messages(result)).toMatch(/edad no coincide/);
  });

  it('tolera un año de diferencia en la edad (cumpleaños cercano)', () => {
    const result = createInterviewSchema.safeParse({ ...interview, birthDate: `${year - 20}-06-15`, age: 20 });

    expect(result.success).toBe(true);
  });

  it('rechaza un año de ingreso posterior al año actual', () => {
    const result = createInterviewSchema.safeParse({ ...interview, admissionYear: year + 1 });

    expect(messages(result)).toMatch(/posterior al año actual/);
  });

  it('rechaza un ingreso a la universidad a una edad incoherente con el nacimiento', () => {
    const result = createInterviewSchema.safeParse({ ...interview, birthDate: `${year - 10}-01-01`, admissionYear: year - 8 });

    expect(messages(result)).toMatch(/coherente con la fecha de nacimiento/);
  });

  it('limita el texto de los aspectos y acuerdos', () => {
    expect(createInterviewSchema.safeParse({ ...interview, aspectsDiscussed: 'x'.repeat(3001) }).success).toBe(false);
    expect(createInterviewSchema.safeParse({ ...interview, agreements: 'x'.repeat(3001) }).success).toBe(false);
    expect(createInterviewSchema.safeParse({ ...interview, aspectsDiscussed: 'x'.repeat(3000) }).success).toBe(true);
  });
});

describe('teléfonos y nombres con las mismas reglas en todos los formularios (A07)', () => {
  it.each(['987654321', '+51 987-654-321', '(084) 477 123'])('el contacto de apoyo acepta «%s»', (phone) => {
    expect(upsertSupportContactSchema.safeParse({ fullName: 'María Pérez', relationship: 'Madre', phone }).success).toBe(true);
  });

  it.each(['novecientos', '98765abcd', '12345', '9'.repeat(21)])('el contacto de apoyo rechaza «%s»', (phone) => {
    expect(upsertSupportContactSchema.safeParse({ fullName: 'María Pérez', relationship: 'Madre', phone }).success).toBe(false);
  });

  it('el perfil rechaza un teléfono con letras y acepta vacío', () => {
    expect(updateProfileSchema.safeParse({ phone: 'abc123' }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ phone: '' }).success).toBe(true);
  });

  it('el teléfono opcional acepta ausencia y vacío', () => {
    expect(optionalPhone().safeParse(undefined).success).toBe(true);
    expect(optionalPhone().safeParse('').success).toBe(true);
  });

  it('un nombre admite tildes, apóstrofes y espacios interiores; no admite solo espacios ni uno de una letra', () => {
    const name = personName('El nombre');

    expect(name.safeParse("María de los Ángeles D'Alessandro").success).toBe(true);
    expect(name.safeParse('   ').success).toBe(false);
    expect(name.safeParse('A').success).toBe(false);
    expect(name.safeParse('x'.repeat(101)).success).toBe(false);
    expect(name.parse('  Lucía  ')).toBe('Lucía');
  });
});
