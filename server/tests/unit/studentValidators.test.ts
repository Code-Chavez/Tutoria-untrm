import { createStudentSchema } from '@interfaces/http/validators/student.validators';

const base = {
  studentCode: '20191234',
  firstName: 'Ana',
  lastName: 'Torres',
  cycle: 5,
  schoolId: '6f9619ff-8b86-d011-b42d-00c04fc964ff',
};

describe('createStudentSchema (mismas reglas que la carga masiva, A03)', () => {
  it('guarda el correo sin espacios y en minúsculas', () => {
    const parsed = createStudentSchema.parse({ ...base, email: '  Ana.Torres@UNTRM.edu.pe ' });

    expect(parsed.email).toBe('ana.torres@untrm.edu.pe');
  });

  it('acepta correo y teléfono vacíos o ausentes', () => {
    expect(createStudentSchema.safeParse({ ...base, email: '', phone: '' }).success).toBe(true);
    expect(createStudentSchema.safeParse(base).success).toBe(true);
  });

  it.each(['sin-arroba', 'ana@', 'ana perez@untrm.edu.pe'])('rechaza el correo «%s»', (email) => {
    expect(createStudentSchema.safeParse({ ...base, email }).success).toBe(false);
  });

  it.each(['98765abcd', 'nueve ocho', '987654321987654321987'])('rechaza el teléfono «%s»', (phone) => {
    expect(createStudentSchema.safeParse({ ...base, phone }).success).toBe(false);
  });

  it('acepta teléfonos con prefijo, espacios y guiones', () => {
    expect(createStudentSchema.safeParse({ ...base, phone: '+51 987-654-321' }).success).toBe(true);
  });
});
