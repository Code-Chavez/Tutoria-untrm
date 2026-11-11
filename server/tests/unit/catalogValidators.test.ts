import { z } from 'zod';
import { CatalogKind } from '@domain/entities/Catalog';
import { catalogCreateSchema, catalogUpdateSchema } from '@interfaces/http/validators/catalog.validators';

const KINDS: CatalogKind[] = ['faculties', 'schools', 'periods', 'cycles', 'services', 'motives'];

describe('catalogUpdateSchema (issue #279)', () => {
  it.each(KINDS)('«%s»: una edición parcial se valida sin lanzar errores inesperados', (kind) => {
    expect(() => catalogUpdateSchema(kind)).not.toThrow();
    expect(catalogUpdateSchema(kind).parse({ isActive: false })).toEqual({ isActive: false });
    expect(catalogUpdateSchema(kind).parse({ name: '  Nombre válido  ' })).toEqual({ name: 'Nombre válido' });
  });

  it('la edición no deja cambiar el código de ciclos, servicios y motivos', () => {
    for (const kind of ['cycles', 'services', 'motives'] as const) {
      expect(catalogUpdateSchema(kind).parse({ name: 'Nuevo nombre', code: 'CAMBIO' })).toEqual({ name: 'Nuevo nombre' });
    }
  });

  it('en escuelas y periodos acepta sus campos propios', () => {
    const faculty = '3e0c2f25-93b8-4217-b40f-880e7aea4868';
    expect(catalogUpdateSchema('schools').parse({ name: 'Escuela', facultyId: faculty, cycleCount: 10 })).toEqual({ name: 'Escuela', facultyId: faculty, cycleCount: 10 });
    const period = catalogUpdateSchema('periods').parse({ startDate: '2026-08-01', endDate: '2026-12-20' }) as { startDate: Date; endDate: Date };
    expect(period.startDate).toBeInstanceOf(Date);
    expect(period.endDate).toBeInstanceOf(Date);
  });

  it('un valor inválido sigue siendo un ZodError (400), no un error inesperado', () => {
    expect(() => catalogUpdateSchema('faculties').parse({ name: 'X' })).toThrow(z.ZodError);
    expect(() => catalogUpdateSchema('schools').parse({ cycleCount: 99 })).toThrow(z.ZodError);
    expect(() => catalogUpdateSchema('schools').parse({ facultyId: 'no-es-uuid' })).toThrow(z.ZodError);
  });

  it('el alta sigue exigiendo el código donde corresponde', () => {
    expect(() => catalogCreateSchema('motives').parse({ name: 'Motivo' })).toThrow(z.ZodError);
    expect(catalogCreateSchema('faculties').parse({ name: 'Facultad nueva' })).toEqual({ name: 'Facultad nueva' });
  });
});
