// Nombres que ve la gente. Los roles del sistema («Tutorado», «Docente Tutor», «Administrador DBU»…) son códigos estables
// que usan los permisos y las rutas: no se renombran; aquí solo se traducen para mostrarlos (A11).
const ROLE_DISPLAY: Record<string, string> = {
  Tutorado: 'Estudiante',
  'Docente Tutor': 'Docente',
  'Administrador DBU': 'Administrador',
  'Profesional de Servicio': 'Profesional de servicio',
};

// Del Profesional de Servicio (HU-30) se muestra su especialidad, no el nombre genérico del rol.
const PROFESSION_BY_SERVICE: Record<string, string> = {
  ESCUELA: 'Profesional de Escuela',
  PSICOPEDAGOGIA: 'Profesional de Psicopedagogía',
  PSICOLOGIA: 'Profesional de Psicología',
  ASISTENCIA_SOCIAL: 'Profesional de Asistencia Social',
  SALUD: 'Profesional de Salud',
};

/** Nombre visible de un rol (sin considerar el servicio). */
export function roleDisplayName(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

/** Nombre visible del rol de una persona; para el Profesional de Servicio, su especialidad. */
export function getRoleLabel(role: string, service?: string | null): string {
  if (role === 'Profesional de Servicio' && service) return PROFESSION_BY_SERVICE[service] ?? roleDisplayName(role);
  return roleDisplayName(role);
}
