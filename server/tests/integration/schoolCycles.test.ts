import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaCatalogRepository } from '@infrastructure/repositories/PrismaCatalogRepository';
import { PrismaSchoolRepository } from '@infrastructure/repositories/PrismaSchoolRepository';
import { UpdateCatalogEntryUseCase } from '@application/use-cases/catalogs/CatalogUseCases';
import { CatalogValidationError } from '@application/use-cases/catalogs/CatalogErrors';

jest.setTimeout(180_000);
const prisma = new PrismaClient();
afterAll(async () => { await prisma.$disconnect(); });

const databaseTest = process.env.REQUIRE_DB_TESTS === '1' ? it : it.skip;

databaseTest('persiste y expone los ciclos por escuela; impide ocultar un ciclo ocupado y revierte sus datos de prueba', async () => {
  const rollback = new Error('ROLLBACK_SCHOOL_CYCLES_TEST');
  try {
    await prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.create({ data: { name: `Prueba ciclos ${Date.now()}` } });
      const school = await tx.school.create({ data: { name: 'Escuela de doce ciclos', facultyId: faculty.id, cycleCount: 12 } });
      const catalog = new PrismaCatalogRepository(tx as unknown as PrismaClient);
      const schools = new PrismaSchoolRepository(tx as unknown as PrismaClient);
      expect((await schools.findById(school.id))?.cycleCount).toBe(12);
      expect((await catalog.findById('schools', school.id))?.cycleCount).toBe(12);
      await tx.student.create({ data: { studentCode: `99${String(Date.now()).slice(-10)}`, firstName: 'Prueba', lastName: 'Ciclos', cycle: 12, schoolId: school.id } });
      const update = new UpdateCatalogEntryUseCase(catalog);
      await expect(update.execute('schools', school.id, { cycleCount: 10 })).rejects.toBeInstanceOf(CatalogValidationError);
      await update.execute('schools', school.id, { cycleCount: 14 });
      expect((await schools.findById(school.id))?.cycleCount).toBe(14);
      throw rollback;
    }, { timeout: 120_000 });
    throw new Error('La transacción de prueba debía revertirse');
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
