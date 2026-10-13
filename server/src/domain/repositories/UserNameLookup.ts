/** Nombres completos de varias personas en una sola lectura (p. ej. los usuarios que aparecen en un expediente). */
export interface UserNameLookup {
  /** Mapa id → «Nombre Apellido»; los ids que no existen simplemente no aparecen. */
  findNamesByIds(ids: string[]): Promise<Map<string, string>>;
}
