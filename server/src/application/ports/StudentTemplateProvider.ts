/** Plantilla Excel con las columnas que se piden para cargar estudiantes. */
export interface StudentTemplateProvider {
  build(): Promise<Buffer>;
}
