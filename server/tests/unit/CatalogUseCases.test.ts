import { Request, Response } from 'express';
import {
  CreateCatalogEntryUseCase,
  DeleteCatalogEntryUseCase,
  ListCatalogUseCase,
  UpdateCatalogEntryUseCase,
} from '@application/use-cases/catalogs/CatalogUseCases';
import {
  CatalogDuplicateError,
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  CatalogValidationError,
} from '@application/use-cases/catalogs/CatalogErrors';
import { CatalogRepository } from '@domain/repositories/CatalogRepository';
import { CatalogEntry } from '@domain/entities/Catalog';
import { CatalogController } from '@interfaces/http/controllers/CatalogController';
import { catalogCreateSchema, catalogUpdateSchema } from '@interfaces/http/validators/catalog.validators';
import { buildAuditEntry } from '@infrastructure/database/auditEntry';

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: 'e1',
  kind: 'faculties',
  name: 'Ingeniería',
  isActive: true,
  code: null,
  facultyId: null,
  startDate: null,
  endDate: null,
  usage: 0,
  ...over,
});

describe('Catálogos maestros (HU-48)', () => {
  let repo: jest.Mocked<CatalogRepository>;

  beforeEach(() => {
    repo = {
      list: jest.fn().mockResolvedValue([entry()]),
      findById: jest.fn().mockResolvedValue(entry()),
      // Como el repositorio real: los periodos nacen inactivos salvo que se pida lo contrario.
      create: jest.fn().mockImplementation(async (kind, input) =>
        entry({ kind, ...input, id: 'new', isActive: input.isActive ?? kind !== 'periods' }),
      ),
      update: jest.fn().mockImplementation(async (_k, id, input) => entry({ id, ...input })),
      delete: jest.fn().mockResolvedValue(undefined),
      isDuplicate: jest.fn().mockResolvedValue(false),
      facultyExists: jest.fn().mockResolvedValue(true),
      activateOnlyPeriod: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('alta', () => {
    const create = () => new CreateCatalogEntryUseCase(repo);

    it('crea el elemento', async () => {
      const created = await create().execute('faculties', { name: 'Salud' });
      expect(repo.create).toHaveBeenCalledWith('faculties', { name: 'Salud' });
      expect(created.name).toBe('Salud');
    });

    it('rechaza un nombre o código duplicado', async () => {
      repo.isDuplicate.mockResolvedValue(true);
      await expect(create().execute('services', { name: 'X', code: 'SALUD' })).rejects.toBeInstanceOf(CatalogDuplicateError);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('una escuela exige una facultad existente', async () => {
      repo.facultyExists.mockResolvedValue(false);
      await expect(create().execute('schools', { name: 'Civil', facultyId: 'f-x' })).rejects.toBeInstanceOf(CatalogValidationError);
    });

    it('un periodo exige fin posterior al inicio', async () => {
      await expect(
        create().execute('periods', { name: '2027-I', startDate: new Date('2027-08-01'), endDate: new Date('2027-03-01') }),
      ).rejects.toBeInstanceOf(CatalogValidationError);
    });

    it('un periodo creado como activo deja a los demás inactivos', async () => {
      await create().execute('periods', {
        name: '2027-I', startDate: new Date('2027-03-01'), endDate: new Date('2027-07-31'), isActive: true,
      });
      expect(repo.activateOnlyPeriod).toHaveBeenCalledWith('new');
    });

    it('un periodo creado inactivo no toca al activo', async () => {
      await create().execute('periods', { name: '2027-I', startDate: new Date('2027-03-01'), endDate: new Date('2027-07-31') });
      expect(repo.activateOnlyPeriod).not.toHaveBeenCalled();
    });
  });

  describe('edición', () => {
    const update = () => new UpdateCatalogEntryUseCase(repo);

    it('responde no encontrado si el elemento no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(update().execute('faculties', 'x', { name: 'Y' })).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
    });

    it('no permite cambiar el código, que referencian los demás datos', async () => {
      repo.findById.mockResolvedValue(entry({ kind: 'services', code: 'SALUD', name: 'Salud' }));
      await update().execute('services', 'e1', { name: 'Servicio de Salud', code: 'OTRO' });
      expect(repo.update).toHaveBeenCalledWith('services', 'e1', { name: 'Servicio de Salud' });
    });

    it('al renombrar comprueba duplicados excluyendo al propio elemento', async () => {
      repo.isDuplicate.mockResolvedValue(true);
      await expect(update().execute('faculties', 'e1', { name: 'Salud' })).rejects.toBeInstanceOf(CatalogDuplicateError);
      expect(repo.isDuplicate).toHaveBeenCalledWith('faculties', expect.objectContaining({ name: 'Salud' }), 'e1');
    });

    it('desactivar no consulta duplicados ni exige que esté libre de uso', async () => {
      repo.findById.mockResolvedValue(entry({ usage: 12 }));
      await update().execute('faculties', 'e1', { isActive: false });
      expect(repo.isDuplicate).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('faculties', 'e1', { isActive: false });
    });

    it('activar un periodo desactiva los demás', async () => {
      repo.findById.mockResolvedValue(entry({ kind: 'periods', isActive: false, startDate: new Date('2027-03-01'), endDate: new Date('2027-07-31') }));
      await update().execute('periods', 'e1', { isActive: true });
      expect(repo.activateOnlyPeriod).toHaveBeenCalledWith('e1');
    });

    it('valida las fechas de un periodo contra las que ya tiene', async () => {
      repo.findById.mockResolvedValue(entry({ kind: 'periods', startDate: new Date('2027-03-01'), endDate: new Date('2027-07-31') }));
      await expect(update().execute('periods', 'e1', { endDate: new Date('2027-01-01') })).rejects.toBeInstanceOf(CatalogValidationError);
    });
  });

  describe('baja con control de uso', () => {
    const remove = () => new DeleteCatalogEntryUseCase(repo);

    it('elimina un elemento sin uso', async () => {
      await remove().execute('faculties', 'e1');
      expect(repo.delete).toHaveBeenCalledWith('faculties', 'e1');
    });

    it('no elimina uno en uso y sugiere desactivarlo', async () => {
      repo.findById.mockResolvedValue(entry({ usage: 7 }));
      const error = await remove().execute('faculties', 'e1').catch((e) => e);
      expect(error).toBeInstanceOf(CatalogEntryInUseError);
      expect(error.message).toMatch(/7 registro/);
      expect(error.message).toMatch(/Desactívalo/);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('responde no encontrado si no existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(remove().execute('faculties', 'x')).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
    });
  });

  it('lista un catálogo con su uso', async () => {
    await expect(new ListCatalogUseCase(repo).execute('faculties')).resolves.toEqual([entry()]);
  });

  describe('validación de entrada', () => {
    it('ciclos: solo números del 1 al 14', () => {
      const schema = catalogCreateSchema('cycles');
      expect(schema.safeParse({ name: 'Ciclo 14', code: '14' }).success).toBe(true);
      expect(schema.safeParse({ name: 'Ciclo 15', code: '15' }).success).toBe(false);
      expect(schema.safeParse({ name: 'Ciclo 0', code: '0' }).success).toBe(false);
    });

    it('servicios y motivos: código en MAYÚSCULAS y guiones bajos', () => {
      expect(catalogCreateSchema('services').safeParse({ name: 'Nutrición', code: 'NUTRICION' }).success).toBe(true);
      expect(catalogCreateSchema('services').safeParse({ name: 'Nutrición', code: 'nutrición' }).success).toBe(false);
      expect(catalogCreateSchema('motives').safeParse({ name: 'Económico', code: 'ECONOMIC' }).success).toBe(true);
    });

    it('escuelas: la facultad debe ser un UUID; periodos: fechas válidas', () => {
      expect(catalogCreateSchema('schools').safeParse({ name: 'Civil', facultyId: 'no-uuid' }).success).toBe(false);
      expect(catalogCreateSchema('periods').safeParse({ name: 'P', startDate: 'mañana', endDate: '2027-07-31' }).success).toBe(false);
    });

    it('en la edición todo es opcional y el código se descarta', () => {
      const parsed = catalogUpdateSchema('services').parse({ name: 'Nuevo nombre', code: 'OTRO' });
      expect(parsed).toEqual({ name: 'Nuevo nombre' });
      expect(catalogUpdateSchema('services').parse({})).toEqual({});
    });
  });

  describe('CatalogController', () => {
    const res = () => {
      const r = { status: jest.fn(), json: jest.fn() };
      r.status.mockReturnValue(r);
      return r;
    };
    const controller = () =>
      new CatalogController(
        new ListCatalogUseCase(repo), new CreateCatalogEntryUseCase(repo),
        new UpdateCatalogEntryUseCase(repo), new DeleteCatalogEntryUseCase(repo),
      );
    const req = (over: object = {}) => ({ params: { type: 'faculties' }, body: {}, ...over }) as unknown as Request;

    it('404 ante un catálogo desconocido', async () => {
      const r = res();
      await controller().list(req({ params: { type: 'zonas' } }), r as unknown as Response);
      expect(r.status).toHaveBeenCalledWith(404);
    });

    it('201 al crear, 400 si el cuerpo es inválido y 409 si está duplicado', async () => {
      const ok = res();
      await controller().create(req({ body: { name: 'Salud' } }), ok as unknown as Response);
      expect(ok.status).toHaveBeenCalledWith(201);

      const bad = res();
      await controller().create(req({ body: { name: 'x' } }), bad as unknown as Response);
      expect(bad.status).toHaveBeenCalledWith(400);

      repo.isDuplicate.mockResolvedValue(true);
      const dup = res();
      await controller().create(req({ body: { name: 'Salud' } }), dup as unknown as Response);
      expect(dup.status).toHaveBeenCalledWith(409);
    });

    it('409 al eliminar un elemento en uso y 404 si no existe', async () => {
      repo.findById.mockResolvedValue(entry({ usage: 3 }));
      const inUse = res();
      await controller().remove(req({ params: { type: 'faculties', id: 'e1' } }), inUse as unknown as Response);
      expect(inUse.status).toHaveBeenCalledWith(409);

      repo.findById.mockResolvedValue(null);
      const missing = res();
      await controller().remove(req({ params: { type: 'faculties', id: 'zz' } }), missing as unknown as Response);
      expect(missing.status).toHaveBeenCalledWith(404);
    });
  });

  describe('auditoría', () => {
    it.each(['Faculty', 'School', 'AcademicPeriod', 'CatalogItem'])('registra los cambios de %s', (model) => {
      const created = buildAuditEntry({ model, operation: 'create', args: {}, result: { id: 'x1' }, userId: 'u1' });
      expect(created).toMatchObject({ action: 'CREATE', entity: model, entityId: 'x1', userId: 'u1' });

      const updated = buildAuditEntry({
        model, operation: 'update', args: { where: { id: 'x1' }, data: { name: 'N', isActive: false } }, result: { id: 'x1' }, userId: 'u1',
      });
      expect(updated).toMatchObject({ action: 'UPDATE', details: 'name, isActive' });

      expect(buildAuditEntry({ model, operation: 'delete', args: {}, result: { id: 'x1' }, userId: 'u1' })).toMatchObject({ action: 'DELETE' });
    });

    it('sin usuario autenticado (seed, migraciones) no audita', () => {
      expect(buildAuditEntry({ model: 'Faculty', operation: 'create', args: {}, result: { id: 'x' } })).toBeNull();
    });
  });
});
