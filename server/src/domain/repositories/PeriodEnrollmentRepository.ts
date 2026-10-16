/** Matrícula por periodo: quiénes están en la tutoría de cada periodo. */
export interface PeriodEnrollmentRepository {
  /** Matricula (o actualiza escuela y ciclo) al estudiante en el periodo. Idempotente. */
  enroll(input: { periodId: string; studentId: string; schoolId: string; cycle: number }): Promise<void>;
  isEnrolled(periodId: string, studentId: string): Promise<boolean>;
  count(periodId: string): Promise<number>;
}
