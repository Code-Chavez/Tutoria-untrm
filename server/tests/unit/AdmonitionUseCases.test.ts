import {
  AdmonitionForbiddenError,
  AdmonitionNotFoundError,
  AdmonitionScopeResolver,
  AdmonitionTutorError,
  GetAdmonitionFileUseCase,
  InvalidAdmonitionError,
  IssueAdmonitionUseCase,
  ListAdmonishableTutorsUseCase,
  ListAdmonitionsUseCase,
} from '@application/use-cases/admonitions/AdmonitionUseCases';
import { resolveDeanFaculty, DeanFacultyRequiredError } from '@application/use-cases/users/deanFaculty';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { Admonition, AdmonitionRepository } from '@domain/repositories/AdmonitionRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';

const NOW = new Date('2026-11-10T12:00:00Z');
const ROLES: Record<string, string> = { dean: 'Decano', dbu: 'Administrador DBU', coord: 'Coordinador', tutor: 'Docente Tutor' };
const USERS: Record<string, object> = {
  dean: { id: 'dean', roleId: 'r-dean', facultyId: 'f1', firstName: 'Héctor', lastName: 'Vargas' },
  deanNoFaculty: { id: 'deanNoFaculty', roleId: 'r-dean', facultyId: null },
  dbu: { id: 'dbu', roleId: 'r-dbu' },
  coord: { id: 'coord', roleId: 'r-coord' },
  t1: { id: 't1', roleId: 'r-tutor', schoolId: 's1', firstName: 'Elena', lastName: 'Ramírez' },
  t2: { id: 't2', roleId: 'r-tutor', schoolId: 's2', firstName: 'Miguel', lastName: 'Torres' },
  noSchool: { id: 'noSchool', roleId: 'r-tutor', schoolId: null },
  student: { id: 'student', roleId: 'r-student' },
};
const school = (id: string, facultyId: string) => ({ id, name: `Escuela ${id}`, facultyId, isActive: true, createdAt: new Date() });

describe('amonestaciones (fase 5)', () => {
  let users: jest.Mocked<UserRepository>;
  let roles: jest.Mocked<RoleRepository>;
  let schools: jest.Mocked<SchoolRepository>;
  let guard: jest.Mocked<Pick<StudentAccessGuard, 'scopeFor'>>;
  let admonitions: jest.Mocked<AdmonitionRepository>;
  let storage: jest.Mocked<EvidenceStorage>;
  let audit: jest.Mocked<AuditLogRepository>;
  let resolver: AdmonitionScopeResolver;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockImplementation(async (id: string) => USERS[id] ?? null),
      findAll: jest.fn().mockResolvedValue([USERS.t1, USERS.t2, USERS.noSchool]),
    } as unknown as jest.Mocked<UserRepository>;
    roles = {
      findById: jest.fn().mockImplementation(async (id: string) => ({ id, name: ROLES[id.replace('r-', '')] ?? 'Tutorado' })),
      findByName: jest.fn().mockResolvedValue({ id: 'r-tutor', name: 'Docente Tutor' }),
    } as unknown as jest.Mocked<RoleRepository>;
    schools = { findAll: jest.fn().mockResolvedValue([school('s1', 'f1'), school('s2', 'f2')]) } as unknown as jest.Mocked<SchoolRepository>;
    guard = { scopeFor: jest.fn().mockResolvedValue({ kind: 'SCHOOLS', schoolIds: ['s1'] }) };
    admonitions = {
      create: jest.fn().mockImplementation(async (d) => ({ id: 'a1', createdAt: NOW, ...d }) as Admonition),
      findById: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
    };
    storage = { save: jest.fn().mockResolvedValue('key-1'), resolvePath: jest.fn().mockReturnValue('/abs/key-1'), delete: jest.fn() };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
    resolver = new AdmonitionScopeResolver(users, roles, guard as unknown as StudentAccessGuard);
  });

  describe('alcance', () => {
    it('Decano: su facultad; DBU: todo; coordinación: sus escuelas, solo lectura', async () => {
      expect(await resolver.resolve('dean')).toEqual({ scope: { kind: 'FACULTY', facultyId: 'f1' }, canIssue: true });
      expect(await resolver.resolve('dbu')).toEqual({ scope: { kind: 'ALL' }, canIssue: true });
      expect(await resolver.resolve('coord')).toEqual({ scope: { kind: 'SCHOOLS', schoolIds: ['s1'] }, canIssue: false });
    });

    it('un Decano sin facultad, o un rol sin alcance, no accede', async () => {
      await expect(resolver.resolve('deanNoFaculty')).rejects.toBeInstanceOf(AdmonitionForbiddenError);
      guard.scopeFor.mockResolvedValue({ kind: 'TUTOR', tutorId: 't1' });
      await expect(resolver.resolve('t1')).rejects.toBeInstanceOf(AdmonitionForbiddenError);
    });
  });

  describe('docentes amonestables', () => {
    it('el Decano ve solo los de su facultad y con escuela; la coordinación no usa esta lista', async () => {
      const list = new ListAdmonishableTutorsUseCase(resolver, users, roles, schools);

      const tutors = await list.execute('dean');

      expect(tutors).toEqual([{ tutorId: 't1', fullName: 'Elena Ramírez', schoolId: 's1', schoolName: 'Escuela s1' }]);
      await expect(list.execute('coord')).rejects.toBeInstanceOf(AdmonitionForbiddenError);
    });
  });

  describe('emitir', () => {
    const issue = () => new IssueAdmonitionUseCase(resolver, users, roles, schools, admonitions, storage, audit, () => NOW);
    const input = { tutorId: 't1', issuedOn: '2026-11-09', reason: 'No registró ninguna sesión de tutoría' };

    it('registra la fecha, el motivo y, con documento, la huella; todo queda en la bitácora', async () => {
      const file = { buffer: Buffer.from('%PDF-1.4'), fileName: 'resolucion.pdf', mimeType: 'application/pdf', fileSize: 8 };

      const created = await issue().execute('dean', { ...input, file }, '10.0.0.1');

      expect(created).toMatchObject({ tutorId: 't1', issuedById: 'dean', schoolId: 's1', facultyId: 'f1', fileName: 'resolucion.pdf', storageKey: 'key-1' });
      expect(created.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(audit.create.mock.calls[0][0]).toMatchObject({ action: 'ADMONITION_ISSUED', ipAddress: '10.0.0.1' });
    });

    it('sin documento también se registra', async () => {
      await issue().execute('dean', input);

      expect(storage.save).not.toHaveBeenCalled();
      expect(admonitions.create.mock.calls[0][0].storageKey).toBeUndefined();
    });

    it('el Decano no amonesta a docentes de otra facultad ni sin escuela; la DBU sí a cualquiera', async () => {
      await expect(issue().execute('dean', { ...input, tutorId: 't2' })).rejects.toBeInstanceOf(AdmonitionTutorError);
      await expect(issue().execute('dean', { ...input, tutorId: 'noSchool' })).rejects.toBeInstanceOf(AdmonitionTutorError);
      await expect(issue().execute('dean', { ...input, tutorId: 'student' })).rejects.toBeInstanceOf(AdmonitionTutorError);
      await expect(issue().execute('dbu', { ...input, tutorId: 't2' })).resolves.toMatchObject({ facultyId: 'f2' });
    });

    it('la coordinación no emite; motivo corto o fecha inválida o futura se rechazan sin guardar nada', async () => {
      await expect(issue().execute('coord', input)).rejects.toBeInstanceOf(AdmonitionForbiddenError);
      await expect(issue().execute('dean', { ...input, reason: 'corto' })).rejects.toBeInstanceOf(InvalidAdmonitionError);
      await expect(issue().execute('dean', { ...input, issuedOn: '09/11/2026' })).rejects.toBeInstanceOf(InvalidAdmonitionError);
      await expect(issue().execute('dean', { ...input, issuedOn: '2026-12-31' })).rejects.toBeInstanceOf(InvalidAdmonitionError);

      expect(admonitions.create).not.toHaveBeenCalled();
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('consultar', () => {
    const row = { id: 'a1', tutorId: 't1', issuedById: 'dean', schoolId: 's1', facultyId: 'f1', issuedOn: NOW, reason: 'x', storageKey: 'key-1', fileName: 'r.pdf', createdAt: NOW } as Admonition;

    it('filtra la lista según el alcance y arma nombres sin exponer la clave de almacenamiento', async () => {
      admonitions.list.mockResolvedValue([row]);
      const list = new ListAdmonitionsUseCase(resolver, users, schools, admonitions);

      const result = await list.execute('dean');

      expect(admonitions.list).toHaveBeenLastCalledWith({ facultyId: 'f1' });
      expect(result[0]).toMatchObject({ tutorName: 'Elena Ramírez', schoolName: 'Escuela s1', issuedByName: 'Héctor Vargas', hasFile: true });
      expect(JSON.stringify(result)).not.toContain('key-1');
      await list.execute('coord');
      expect(admonitions.list).toHaveBeenLastCalledWith({ schoolIds: ['s1'] });
      await list.execute('dbu');
      expect(admonitions.list).toHaveBeenLastCalledWith({});
    });

    it('el documento se entrega solo dentro del alcance; fuera, «no encontrada»', async () => {
      admonitions.findById.mockResolvedValue(row);
      const get = new GetAdmonitionFileUseCase(resolver, admonitions, storage);

      expect(await get.execute('a1', 'dean')).toEqual({ fileName: 'r.pdf', absolutePath: '/abs/key-1' });
      guard.scopeFor.mockResolvedValue({ kind: 'SCHOOLS', schoolIds: ['otra'] });
      await expect(get.execute('a1', 'coord')).rejects.toBeInstanceOf(AdmonitionNotFoundError);
      await expect(get.execute('a1', 'student')).rejects.toBeInstanceOf(AdmonitionNotFoundError);
      admonitions.findById.mockResolvedValue({ ...row, storageKey: null });
      await expect(get.execute('a1', 'dean')).rejects.toBeInstanceOf(AdmonitionNotFoundError);
    });
  });

  describe('facultad del Decano', () => {
    const faculties = { findAll: jest.fn().mockResolvedValue([{ id: 'f1', name: 'FISME' }]) } as unknown as FacultyRepository;

    it('el Decano guarda su facultad; los demás roles la descartan; sin facultad válida se rechaza', async () => {
      expect(await resolveDeanFaculty(faculties, 'Decano', 'f1')).toBe('f1');
      expect(await resolveDeanFaculty(faculties, 'Coordinador', 'f1')).toBeNull();
      await expect(resolveDeanFaculty(faculties, 'Decano', null)).rejects.toBeInstanceOf(DeanFacultyRequiredError);
      await expect(resolveDeanFaculty(faculties, 'Decano', 'nada')).rejects.toBeInstanceOf(DeanFacultyRequiredError);
    });
  });
});
