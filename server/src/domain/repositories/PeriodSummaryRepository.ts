/** Lo ocurrido en un periodo, para el reporte de cierre. Son conteos: no contiene datos de las personas atendidas. */
export interface PeriodSummary {
  students: { total: number; active: number; atRisk: number };
  tutors: number;
  sessions: { total: number; individual: number; group: number; cancelled: number; withAttendance: number };
  referrals: { total: number; open: number };
  tutoringRequests: { total: number; open: number };
  evaluations: { responses: number };
  semesterReports: { submitted: number };
  /** Lo que sigue abierto al momento de cerrar y quedará en solo lectura. */
  pending: { openRequests: number; openReferrals: number; upcomingSessions: number };
}

export interface PeriodSummaryRepository {
  summarize(period: { id: string; startDate: Date; endDate: Date }, now: Date): Promise<PeriodSummary>;
}
