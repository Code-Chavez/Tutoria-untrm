import { PrismaClient } from '@prisma/client';
import { PrismaAcademicPeriodRepository } from '../../src/infrastructure/repositories/PrismaAcademicPeriodRepository';

/**
 * El periodo vigente tal como lo resuelve el servidor (el repositorio que usan los casos de uso): las pruebas deben crear
 * y consultar sus datos en ese mismo periodo. Buscar «un periodo activo» sin ese orden puede devolver otro cuando una
 * prueba paralela mantiene un periodo propio abierto, y entonces la prueba escribe en un periodo y el servidor lee otro.
 */
export async function currentPeriodId(prisma: PrismaClient): Promise<string> {
  const period = await new PrismaAcademicPeriodRepository(prisma).findActive();
  if (!period) throw new Error('No hay un periodo vigente en la base de datos de prueba');
  return period.id;
}

/**
 * Fecha de alta de los periodos propios de una prueba: el servidor toma como vigente el activo más reciente, así que un
 * periodo de prueba nace «antiguo» para no desplazar al del sistema mientras otras suites corren a la vez.
 */
export const TEST_PERIOD_CREATED_AT = new Date('2000-01-01T00:00:00.000Z');
