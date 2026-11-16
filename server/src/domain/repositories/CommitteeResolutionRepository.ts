/** «Resolución de Decanato N.° …» que aprueba la comisión de tutoría de una escuela en un periodo. */
export interface CommitteeResolutionRecord {
  id: string;
  periodId: string;
  schoolId: string;
  number: string;
  issuedOn: Date;
  createdById: string;
  createdAt: Date;
}

export interface CommitteeResolutionRepository {
  /** Una por escuela y periodo: guardar de nuevo reemplaza el número y la fecha. */
  upsert(input: { periodId: string; schoolId: string; number: string; issuedOn: Date; createdById: string }): Promise<CommitteeResolutionRecord>;
  find(periodId: string, schoolId: string): Promise<CommitteeResolutionRecord | null>;
  list(filters: { schoolIds?: string[]; periodId?: string; schoolId?: string }): Promise<CommitteeResolutionRecord[]>;
}
