import { AcademicPeriod } from '../entities/AcademicPeriod';

export interface AcademicPeriodRepository {
  /** El periodo académico actualmente habilitado (HU-38), si existe. */
  findActive(): Promise<AcademicPeriod | null>;
  /** Todos los semestres, el más reciente primero (filtro de reportes, HU-47). */
  findAll(): Promise<AcademicPeriod[]>;
  findById(id: string): Promise<AcademicPeriod | null>;
  /** El periodo que contiene la fecha (el día final entra completo), o null si ninguno la cubre. */
  findByDate(date: Date): Promise<AcademicPeriod | null>;
  /**
   * Cierra el periodo vigente de forma atómica: congela la matrícula, lo deja no vigente y guarda quién, cuándo y el resumen.
   * Devuelve false si ya no estaba vigente (otro proceso lo cerró antes).
   */
  close(id: string, closedById: string, closedAt: Date, summary: unknown): Promise<boolean>;
  /** Vuelve a abrir un periodo cerrado (recuperación de un cierre por error); solo si no hay otro vigente. */
  reopen(id: string): Promise<boolean>;
}
