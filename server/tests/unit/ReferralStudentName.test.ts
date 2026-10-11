import { GetReferralsUseCase } from '@application/use-cases/referrals/GetReferralsUseCase';
import { GetReferralByIdUseCase } from '@application/use-cases/referrals/GetReferralByIdUseCase';
import { withStudent } from '@application/use-cases/referrals/referralAccess';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { StudentReferral } from '@domain/entities/StudentReferral';
import { Student } from '@domain/entities/Student';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

// La bandeja y el detalle del caso deben decir de quién es: antes solo mostraban un fragmento del identificador interno.
const ana = { id: 'st-1', firstName: 'Ana', lastName: 'Torres Ramos', studentCode: '20191234' } as Student;
const referral = { id: 'ref-1', studentId: 'st-1', referredById: 'tutor-1', service: 'PSICOLOGIA', status: 'RECIBIDO', statusHistory: [] } as unknown as StudentReferral;

function setup() {
  const referrals = { findById: jest.fn().mockResolvedValue(referral), findMany: jest.fn().mockResolvedValue([referral, { ...referral, id: 'ref-2' }]) } as unknown as jest.Mocked<StudentReferralRepository>;
  const students = { findById: jest.fn().mockResolvedValue(ana) } as unknown as jest.Mocked<StudentRepository>;
  const users = { findById: jest.fn().mockResolvedValue({ id: 'admin', roleId: 'r' } as User) } as unknown as jest.Mocked<UserRepository>;
  const roles = { findById: jest.fn().mockResolvedValue({ id: 'r', name: 'Administrador DBU' } as Role) } as unknown as jest.Mocked<RoleRepository>;
  return { referrals, students, users, roles };
}

describe('nombre del tutorado en las derivaciones', () => {
  it('la bandeja incluye nombre y código, y consulta cada tutorado una sola vez', async () => {
    const { referrals, students, users, roles } = setup();
    const result = await new GetReferralsUseCase(referrals, users, roles, students).execute('admin');

    expect(result.map((r) => [r.studentName, r.studentCode])).toEqual([
      ['Ana Torres Ramos', '20191234'],
      ['Ana Torres Ramos', '20191234'],
    ]);
    expect(students.findById).toHaveBeenCalledTimes(1);
  });

  it('el detalle incluye nombre y código', async () => {
    const { referrals, students, users, roles } = setup();
    const result = await new GetReferralByIdUseCase(referrals, users, roles, students).execute('ref-1', 'admin');
    expect(result).toEqual(expect.objectContaining({ studentName: 'Ana Torres Ramos', studentCode: '20191234' }));
  });

  it('si no se dispone del repositorio de estudiantes o del estudiante, devuelve la derivación tal cual', async () => {
    expect(await withStudent(undefined, [referral])).toEqual([referral]);
    const students = { findById: jest.fn().mockResolvedValue(null) } as unknown as StudentRepository;
    expect(await withStudent(students, [referral])).toEqual([referral]);
  });
});
