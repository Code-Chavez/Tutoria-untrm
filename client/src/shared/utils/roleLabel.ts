// Etiqueta del servicio del Profesional de Servicio (HU-30), para
// distinguir a qué servicio pertenece más allá del rol genérico.
const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela Profesional',
  PSICOPEDAGOGIA: 'Psicopedagogía',
  PSICOLOGIA: 'Psicología',
  ASISTENCIA_SOCIAL: 'Asistencia Social',
  SALUD: 'Salud',
};

export function getRoleLabel(role: string, service?: string | null): string {
  if (!service) return role;
  return `${role} · ${SERVICE_LABEL[service] ?? service}`;
}
