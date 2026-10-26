import { PrismaClient } from '@prisma/client';
import { ORIGIN_PREFIX, describeDifferences, dropSnapshot, leftovers, preexistingDifferences, sweepOrigin } from './rowLedger';

// Verificación final de toda la corrida (solo se ejecuta si el globalSetup comprobó que la base es de pruebas e instaló el registro):
//  1. red de seguridad: lo que algún archivo no alcanzó a limpiar (p. ej. un proceso que murió) se borra por su origen; lo que siga
//     referenciado por filas ajenas se deja y cuenta como residuo (nunca se borra a la fuerza);
//  2. los parámetros del sistema que una prueba cambiara y no restaurara se devuelven a su valor de antes;
//  3. ninguna fila preexistente puede haberse borrado ni cambiado de valor.
// Si queda cualquier residuo o diferencia, FALLA la corrida: un residuo inesperado no se tolera ni se oculta.
export default async function globalTeardown(): Promise<void> {
  const runId = process.env.SIT_TEST_RUN_ID;
  if (!runId || !process.env.DATABASE_URL) return;
  const pattern = `${ORIGIN_PREFIX}${runId}:%`;
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] });
  const problems: string[] = [];
  try {
    if ((await sweepOrigin(prisma, pattern)) > 0) {
      const left = (await leftovers(prisma, pattern)).map((l) => `${l.tbl}: ${l.n}`).join(', ');
      problems.push(`Filas creadas por las pruebas que no se pudieron borrar porque algo ajeno las referencia (${left}).`);
    }

    let differences = await preexistingDifferences(prisma, runId);
    const parameters = differences.filter((d) => d.tbl === 'system_parameters' && d.kind === 'MODIFICADA' && d.before.key);
    for (const d of parameters) {
      await prisma.systemParameter.update({ where: { key: String(d.before.key) }, data: { value: String(d.before.value) } });
      console.warn(`[jest] El parámetro «${String(d.before.key)}» quedó cambiado por una prueba; se restauró a «${String(d.before.value)}».`);
    }
    if (parameters.length > 0) differences = await preexistingDifferences(prisma, runId);
    if (parameters.length > 0) problems.push(`Una prueba dejó cambiados parámetros del sistema (se restauraron): ${parameters.map((d) => String(d.before.key)).join(', ')}.`);
    if (differences.length > 0) problems.push(`Filas que ya existían y se borraron o cambiaron de valor:${String.fromCharCode(10)}${describeDifferences(differences)}`);
    await dropSnapshot(prisma, runId);
  } finally {
    await prisma.$disconnect();
  }
  if (problems.length > 0) throw new Error(`Las pruebas de integración dejaron residuos o cambios inesperados:${String.fromCharCode(10)}- ${problems.join(String.fromCharCode(10) + '- ')}`);
}
