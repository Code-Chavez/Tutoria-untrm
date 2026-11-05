import { CreateUserUseCase } from '@application/use-cases/users/CreateUserUseCase';
import { UpdateUserUseCase } from '@application/use-cases/users/UpdateUserUseCase';
import { ImportTutorsUseCase } from '@application/use-cases/users/ImportTutorsUseCase';
import { IssueInvitationUseCase } from '@application/use-cases/users/IssueInvitationUseCase';
import { InvalidAccountEmailError } from '@application/use-cases/users/UserErrors';
import { createEmailPolicy } from '@application/validation/email';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { User } from '@domain/entities/User';
import { Role } from '@domain/entities/Role';

// RF-01: las cuentas de usuario (lo que sirve para ingresar) son del dominio institucional; la excepción es una política
// explícita del despliegue. Las mismas reglas rigen el alta por formulario, la edición y la carga masiva de docentes.
const role = (name: string) => ({ id: 'r1', name, description: '', permissions: [], createdAt: new Date() }) as Role;
const existing = (over: Partial<User> = {}) =>
  ({ id: 'u1', email: 'persona@untrm.edu.pe', passwordHash: 'h', firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1', service: null, isActive: true, ...over }) as User;

describe('política de correo de las cuentas (RF-01)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let hasher: jest.Mocked<PasswordHasher>;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(existing()),
      findByEmail: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      create: jest.fn().mockImplementation(async (d) => ({ id: 'new', createdAt: new Date(), updatedAt: new Date(), ...d }) as User),
      update: jest.fn().mockImplementation(async (_id, d) => existing(d)),
    };
    roles = { findById: jest.fn().mockResolvedValue(role('Coordinador')), findByName: jest.fn(), findAll: jest.fn(), create: jest.fn() };
    schools = { findById: jest.fn(), findAll: jest.fn() };
    hasher = { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() };
  });

  describe('alta de una cuenta', () => {
    const input = (email: string) => ({ email, firstName: 'Ana', lastName: 'Ruiz', roleId: 'r1' });
    const create = (policy?: ReturnType<typeof createEmailPolicy>) => new CreateUserUseCase(users, hasher, roles, schools, undefined, policy);

    it('rechaza un correo que no es institucional, sin buscar duplicados ni crear nada', async () => {
      await expect(create().execute(input('ana@gmail.com'))).rejects.toThrow(InvalidAccountEmailError);
      await expect(create().execute(input('ana@gmail.com'))).rejects.toThrow('El correo debe ser institucional (@untrm.edu.pe)');
      expect(users.findByEmail).not.toHaveBeenCalled();
      expect(users.create).not.toHaveBeenCalled();
    });

    it('rechaza un correo mal formado aunque llegue sin pasar por el formulario', async () => {
      await expect(create().execute(input('sin-arroba'))).rejects.toThrow(/formato válido/);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('acepta el institucional sin importar mayúsculas y espacios, y lo guarda normalizado', async () => {
      await create().execute(input('  Persona@UNTRM.EDU.PE '));
      expect(users.findByEmail).toHaveBeenCalledWith('persona@untrm.edu.pe');
      expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'persona@untrm.edu.pe' }));
    });

    it('con una excepción registrada en la política, el dominio agregado pasa y los demás siguen rechazados', async () => {
      const policy = createEmailPolicy('untrm.edu.pe, externo.org');
      await create(policy).execute(input('prof@externo.org'));
      expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'prof@externo.org' }));
      await expect(create(policy).execute(input('prof@otro.org'))).rejects.toThrow(InvalidAccountEmailError);
    });
  });

  describe('edición de una cuenta', () => {
    const update = (policy?: ReturnType<typeof createEmailPolicy>) => new UpdateUserUseCase(users, roles, schools, undefined, policy);

    it('cambiar el correo a otro dominio se rechaza', async () => {
      await expect(update().execute('u1', { email: 'persona@gmail.com' })).rejects.toThrow(InvalidAccountEmailError);
      expect(users.update).not.toHaveBeenCalled();
    });

    it('cambiarlo a uno institucional lo guarda normalizado', async () => {
      await update().execute('u1', { email: ' Nueva@UNTRM.edu.pe' });
      expect(users.update).toHaveBeenCalledWith('u1', expect.objectContaining({ email: 'nueva@untrm.edu.pe' }));
    });

    it('una cuenta anterior a la regla (otro dominio) puede editarse sin tocar su correo, aunque se reenvíe igual', async () => {
      users.findById.mockResolvedValue(existing({ email: 'antigua@gmail.com' }));
      await update().execute('u1', { firstName: 'Nuevo', email: 'ANTIGUA@gmail.com' });
      expect(users.update).toHaveBeenCalledWith('u1', expect.objectContaining({ firstName: 'Nuevo', email: 'antigua@gmail.com' }));
    });

    it('el correo de otra cuenta sigue siendo duplicado, aunque difiera en mayúsculas', async () => {
      users.findByEmail.mockResolvedValue(existing({ id: 'otra', email: 'ocupado@untrm.edu.pe' }));
      await expect(update().execute('u1', { email: 'OCUPADO@untrm.edu.pe' })).rejects.toThrow(/ya está registrado/);
    });
  });

  describe('carga masiva de docentes', () => {
    let createUser: jest.Mocked<Pick<CreateUserUseCase, 'execute'>>;
    let invite: jest.Mocked<Pick<IssueInvitationUseCase, 'execute'>>;
    const row = (rowNumber: number, email: string) => ({ rowNumber, firstName: 'Elena', lastName: 'Ramírez', email, phone: '941000003', school: 'Ingeniería de Sistemas' });

    beforeEach(() => {
      roles.findByName.mockResolvedValue(role('Docente Tutor'));
      schools.findAll.mockResolvedValue([{ id: 's1', name: 'Ingeniería de Sistemas' }] as never);
      createUser = { execute: jest.fn().mockResolvedValue({ id: 'u1' }) };
      invite = { execute: jest.fn().mockResolvedValue({ link: 'x', expiresAt: new Date(), emailSent: true }) };
    });

    const importer = (policy?: ReturnType<typeof createEmailPolicy>) =>
      new ImportTutorsUseCase(users, roles, schools, createUser as unknown as CreateUserUseCase, invite as unknown as IssueInvitationUseCase, policy);

    it('una fila con otro dominio se rechaza con el mismo texto que el formulario y no detiene a las demás', async () => {
      const report = await importer().execute([row(2, 'bien@untrm.edu.pe'), row(3, 'persona@gmail.com'), row(4, 'sin-arroba')], 'admin');

      expect(report.created).toBe(1);
      expect(report.errors.map((e) => [e.row, e.message])).toEqual([
        [3, 'El correo debe ser institucional (@untrm.edu.pe) («persona@gmail.com»)'],
        [4, 'El correo no tiene un formato válido («sin-arroba»)'],
      ]);
      expect(createUser.execute).toHaveBeenCalledTimes(1);
    });

    it('con la política ampliada admite el dominio agregado', async () => {
      const report = await importer(createEmailPolicy('untrm.edu.pe, externo.org')).execute([row(2, 'Prof@Externo.org')], 'admin');
      expect(report.created).toBe(1);
      expect(createUser.execute).toHaveBeenCalledWith(expect.objectContaining({ email: 'prof@externo.org' }));
    });
  });
});
