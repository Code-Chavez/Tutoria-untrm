/**
 * Contador del número de registro de los certificados, uno por ámbito y año.
 *
 * `next` debe llamarse dentro de la misma transacción que guarda el certificado: dos llamadas simultáneas sobre el mismo ámbito
 * y año nunca devuelven el mismo número (la segunda espera a que la primera confirme), y si la transacción se revierte el número
 * no se consume. Un número ya asignado a un certificado, incluso anulado, no se reutiliza.
 */
export interface CertificateSequenceRepository {
  next(scope: string, year: number): Promise<number>;
}
