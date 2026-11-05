export interface AcademicPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  /** Cierre explícito (fase 1): nulo = no cerrado. */
  closedAt?: Date | null;
  closedById?: string | null;
  closureSummary?: unknown;
}
