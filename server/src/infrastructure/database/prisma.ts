import { PrismaClient } from '@prisma/client';
import { auditExtension } from './auditExtension';

const base = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// El cliente extendido aplica el interceptor de auditoría de forma transparente
// para el resto de la app. Se expone con el tipo PrismaClient porque su API de
// delegados es idéntica; la extensión solo añade comportamiento en runtime.
export const prisma: PrismaClient = base.$extends(auditExtension(base)) as unknown as PrismaClient;
