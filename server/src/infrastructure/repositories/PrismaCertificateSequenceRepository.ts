import { Prisma } from '@prisma/client';
import { CertificateSequenceRepository } from '@domain/repositories/CertificateSequenceRepository';

export class PrismaCertificateSequenceRepository implements CertificateSequenceRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  /**
   * Una sola sentencia atómica: crea el contador en 1 o lo incrementa y devuelve el valor. La fila queda bloqueada hasta que
   * la transacción confirme, así que las emisiones simultáneas del mismo ámbito se ordenan sin repetir número.
   */
  async next(scope: string, year: number): Promise<number> {
    const rows = await this.tx.$queryRaw<{ last: number }[]>`
      INSERT INTO certificate_sequences (scope, year, last)
      VALUES (${scope}, ${year}, 1)
      ON CONFLICT (scope, year) DO UPDATE SET last = certificate_sequences.last + 1
      RETURNING last`;
    return Number(rows[0].last);
  }
}
