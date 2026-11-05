/** Correo al que se piden las listas de cada escuela. */
export interface SchoolContactRepository {
  setRequestEmail(schoolId: string, email: string | null): Promise<void>;
}
