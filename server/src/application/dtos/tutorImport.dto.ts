// Fila cruda de la hoja de docentes tutores; el caso de uso la valida.
export interface ImportTutorRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  school: string;
}

export interface TutorImportError {
  row: number;
  email?: string;
  message: string;
}

export interface TutorImportCreated {
  row: number;
  email: string;
  fullName: string;
  school: string;
  /** El correo con el enlace de activación salió hacia el servidor SMTP. */
  emailSent: boolean;
  /** Solo si el correo no salió: enlace de un solo uso para entregarlo por otro medio. */
  invitationLink?: string;
}

export interface TutorImportReport {
  totalRows: number;
  created: number;
  skipped: number;
  createdRows: TutorImportCreated[];
  errors: TutorImportError[];
}
