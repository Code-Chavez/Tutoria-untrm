import { PrismaClient } from '@prisma/client';
import { auditExtension } from './auditExtension';

// Registrar cada consulta SQL en la consola cuesta más que la consulta misma (cada petición hace ~10): solo con
// PRISMA_LOG_QUERIES=1, para depurar. Por defecto, solo errores y avisos.
const logQueries = process.env.PRISMA_LOG_QUERIES === '1';
const base = new PrismaClient({
  log: logQueries ? ['query', 'error', 'warn'] : process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// El cliente extendido aplica el interceptor de auditoría de forma transparente
// para el resto de la app. Se expone con el tipo PrismaClient porque su API de
// delegados es idéntica; la extensión solo añade comportamiento en runtime.
export const prisma: PrismaClient = base.$extends(auditExtension(base)) as unknown as PrismaClient;
