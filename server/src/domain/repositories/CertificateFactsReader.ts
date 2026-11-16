/**
 * Lo que el sistema SABE del docente para ayudar a quien revisa las evidencias de su certificado (corte 5).
 *
 * Son hechos informativos: que haya sesiones o un informe no aprueba nada. La conformidad de cada evidencia la marca una persona,
 * y el sistema no escribe «cumplió» por tener actividad registrada (docs/levantamiento/17_DISENO_CERTIFICACION_DEMOSTRACION.md, §3).
 */
export interface CertificateFacts {
  /** La designación aceptada que respalda el trámite; null si ya no existe. */
  acceptance: { status: string; respondedAt: Date | null; cycle: number } | null;
  /** Sesiones individuales o grupales del docente en el periodo que ya se realizaron (no canceladas y terminadas). */
  sessionsHeld: number;
  /** Si el docente presentó su informe semestral del periodo. */
  semesterReportSubmitted: boolean;
}

export interface CertificateFactsReader {
  factsFor(input: { assignmentId: string | null; periodId: string; tutorId: string }): Promise<CertificateFacts>;
}
