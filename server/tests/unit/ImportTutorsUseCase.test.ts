import { ImportTutorsUseCase, TutorRoleMissingError } from '@application/use-cases/users/ImportTutorsUseCase';
import { CreateUserUseCase } from '@application/use-cases/users/CreateUserUseCase';
import { IssueInvitationUseCase } from '@application/use-cases/users/IssueInvitationUseCase';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

const row = (over = {}) => ({ rowNumber: 2, firstName: 'Elena', lastName: 'Ramírez', email: 'Elena@UNTRM.edu.pe', phone: '941000003', school: 'Ingeniería de Sistemas', ...over });

describe('alta masiva de docentes tutores (fase 3)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let createUser: jest.Mocked<Pick<CreateUserUseCase, 'execute'>>;
  let invite: jest.Mocked<Pick<IssueInvitationUseCase, 'execute'>>;

  beforeEach(() => {
    users = { findByEmail: jest.fn().mockResolvedValue(null) } as unknown as jest.Mocked<UserRepository>;
    roles = { findByName: jest.fn().mockResolvedValue({ id: 'rt', name: 'Docente Tutor' }) } as unknown as jest.Mocked<RoleRepository>;
    schools = { findAll: jest.fn().mockResolvedValue([{ id: 's1', name: 'Ingeniería de Sistemas' }]) } as unknown as jest.Mocked<SchoolRepository>;
    createUser = { execute: jest.fn().mockResolvedValue({ id: 'u1' }) };
    invite = { execute: jest.fn().mockResolvedValue({ link: 'https://x/activar-cuenta/abc', expiresAt: new Date(), emailSent: true }) };
  });

  const useCase = () => new ImportTutorsUseCase(users, roles, schools, createUser as unknown as CreateUserUseCase, invite as unknown as IssueInvitationUseCase);

  it('crea el docente con su escuela y le envía la invitación; el enlace no sale en el informe si el correo salió', async () => {
    const report = await useCase().execute([row()], 'admin', '10.0.0.1');

    expect(createUser.execute).toHaveBeenCalledWith({ email: 'elena@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez', phone: '941000003', roleId: 'rt', schoolId: 's1' });
    expect(invite.execute).toHaveBeenCalledWith('admin', 'u1', '10.0.0.1');
    expect(report).toMatchObject({ totalRows: 1, created: 1, skipped: 0 });
    expect(report.createdRows[0]).toMatchObject({ email: 'elena@untrm.edu.pe', school: 'Ingeniería de Sistemas', emailSent: true });
    expect(report.createdRows[0].invitationLink).toBeUndefined();
  });

  it('si el correo no salió, entrega el enlace a quien administra para que lo haga llegar por otro medio', async () => {
    invite.execute.mockResolvedValue({ link: 'https://x/activar-cuenta/abc', expiresAt: new Date(), emailSent: false });

    const report = await useCase().execute([row()], 'admin');

    expect(report.createdRows[0]).toMatchObject({ emailSent: false, invitationLink: 'https://x/activar-cuenta/abc' });
  });

  it('una fila con error no detiene a las demás y el informe dice por qué', async () => {
    users.findByEmail.mockImplementation(async (email: string) => (email === 'existe@untrm.edu.pe' ? ({ id: 'x' } as never) : null));

    const report = await useCase().execute(
      [
        row({ rowNumber: 2, email: 'bien@untrm.edu.pe' }),
        row({ rowNumber: 3, email: 'sin-arroba' }),
        row({ rowNumber: 4, email: 'existe@untrm.edu.pe' }),
        row({ rowNumber: 5, email: 'bien@untrm.edu.pe' }),
        row({ rowNumber: 6, email: 'otra@untrm.edu.pe', school: 'Escuela Inexistente' }),
        row({ rowNumber: 7, email: '', firstName: '', lastName: 'A' }),
      ],
      'admin',
    );

    expect(report.created).toBe(1);
    const byRow = Object.fromEntries(report.errors.map((e) => [e.row, e.message]));
    expect(byRow[3]).toMatch(/formato válido/);
    expect(byRow[4]).toMatch(/Ya existe una cuenta/);
    expect(byRow[5]).toMatch(/duplicado dentro del archivo/);
    expect(byRow[6]).toMatch(/No se encontró la escuela/);
    expect(byRow[7]).toMatch(/correo es obligatorio/);
    expect(byRow[7]).toMatch(/nombre es obligatorio/);
  });

  it('empareja la escuela sin distinguir mayúsculas ni acentos', async () => {
    const report = await useCase().execute([row({ school: '  INGENIERIA DE SISTEMAS ' })], 'admin');

    expect(report.created).toBe(1);
  });

  it('un fallo al crear una cuenta queda como error de esa fila', async () => {
    createUser.execute.mockRejectedValue(new Error('boom'));

    const report = await useCase().execute([row()], 'admin');

    expect(report).toMatchObject({ created: 0, skipped: 1 });
    expect(report.errors[0].message).toBe('boom');
  });

  it('sin el rol Docente Tutor no hace nada', async () => {
    roles.findByName.mockResolvedValue(null);

    await expect(useCase().execute([row()], 'admin')).rejects.toBeInstanceOf(TutorRoleMissingError);
  });
});
