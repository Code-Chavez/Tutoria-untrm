import type { Permission } from './services/roleService';

/** Área del catálogo a la que pertenece un permiso (lo que va antes de «:» en su código). */
export const groupOf = (code: string) => code.split(':')[0] ?? code;

export const GROUP_LABELS: Record<string, string> = {
  admin: 'Administración del sistema',
  admonitions: 'Amonestaciones',
  audit: 'Bitácora de auditoría',
  branding: 'Identidad visual',
  campuses: 'Sedes',
  catalogs: 'Catálogos',
  'consolidated-reports': 'Informe consolidado',
  evaluation: 'Evaluación de tutoría',
  followups: 'Seguimientos',
  indicators: 'Indicadores',
  interviews: 'Entrevistas iniciales',
  parameters: 'Parámetros',
  referrals: 'Derivaciones',
  reports: 'Informes',
  'semester-reports': 'Informes semestrales',
  sessions: 'Sesiones de tutoría',
  students: 'Tutorados',
  'support-contacts': 'Contactos de apoyo',
  'tutoring-requests': 'Solicitudes de tutoría',
  users: 'Usuarios',
  'work-plans': 'Planes de trabajo',
};

/** Agrupa permisos por área, conservando el orden en que vienen. */
export function groupPermissions(permissions: Permission[]): { key: string; title: string; items: Permission[] }[] {
  const map = new Map<string, Permission[]>();
  for (const permission of permissions) map.set(groupOf(permission.code), [...(map.get(groupOf(permission.code)) ?? []), permission]);
  return [...map.entries()].map(([key, items]) => ({ key, title: GROUP_LABELS[key] ?? key, items }));
}
