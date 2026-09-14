// Fila cruda extraída del Excel por el adaptador de parseo.
// Los valores llegan como texto (tal cual la hoja) y el caso de uso los valida.
export interface ImportStudentRow {
  rowNumber: number; // fila real en la hoja (1-based, incluyendo encabezado) para el reporte
  studentCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  cycle: string;
  school: string; // nombre de la escuela profesional
}

export interface ImportRowError {
  row: number;
  studentCode?: string;
  message: string;
}

export interface ImportCreatedRow {
  row: number;
  studentCode: string;
  fullName: string;
}

export interface ImportReport {
  totalRows: number;
  created: number;
  skipped: number;
  createdRows: ImportCreatedRow[];
  errors: ImportRowError[];
}
