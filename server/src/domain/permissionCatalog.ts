/** Catálogo del sistema: los roles seleccionan permisos, nunca inventan códigos nuevos. */
export const PERMISSION_CATALOG = [
  {
    "code": "users:read",
    "description": "Ver usuarios"
  },
  {
    "code": "users:write",
    "description": "Crear/editar usuarios"
  },
  {
    "code": "users:delete",
    "description": "Desactivar usuarios"
  },
  {
    "code": "students:read",
    "description": "Ver tutorados"
  },
  {
    "code": "students:write",
    "description": "Crear/editar tutorados"
  },
  {
    "code": "students:import",
    "description": "Carga masiva de tutorados"
  },
  {
    "code": "interviews:read",
    "description": "Ver entrevistas iniciales"
  },
  {
    "code": "interviews:write",
    "description": "Registrar entrevistas iniciales"
  },
  {
    "code": "followups:read",
    "description": "Ver fichas de seguimiento"
  },
  {
    "code": "followups:write",
    "description": "Registrar fichas de seguimiento"
  },
  {
    "code": "support-contacts:read",
    "description": "Ver persona de red de apoyo"
  },
  {
    "code": "support-contacts:write",
    "description": "Registrar persona de red de apoyo"
  },
  {
    "code": "tutoring-requests:read",
    "description": "Ver solicitudes de tutoría"
  },
  {
    "code": "tutoring-requests:write",
    "description": "Registrar solicitudes de tutoría"
  },
  {
    "code": "tutoring-requests:self",
    "description": "Solicitar tutoría para sí mismo (autoservicio)"
  },
  {
    "code": "sessions:read",
    "description": "Ver sesiones"
  },
  {
    "code": "sessions:write",
    "description": "Programar sesiones"
  },
  {
    "code": "referrals:read",
    "description": "Ver derivaciones"
  },
  {
    "code": "referrals:write",
    "description": "Crear derivaciones"
  },
  {
    "code": "reports:read",
    "description": "Ver reportes"
  },
  {
    "code": "reports:export",
    "description": "Exportar reportes"
  },
  {
    "code": "audit:read",
    "description": "Consultar bitácora"
  },
  {
    "code": "admin:system",
    "description": "Administrar sistema"
  },
  {
    "code": "evaluation:respond",
    "description": "Responder evaluación"
  },
  {
    "code": "evaluation:manage",
    "description": "Gestionar evaluación"
  },
  {
    "code": "work-plans:read",
    "description": "Ver planes de trabajo semestrales"
  },
  {
    "code": "semester-reports:write",
    "description": "Elaborar el informe semestral de tutoría propio"
  },
  {
    "code": "consolidated-reports:read",
    "description": "Ver el informe consolidado por escuela y facultad"
  },
  {
    "code": "indicators:read",
    "description": "Ver el tablero de indicadores"
  },
  {
    "code": "catalogs:manage",
    "description": "Administrar los catálogos maestros"
  },
  {
    "code": "parameters:manage",
    "description": "Administrar los parámetros del sistema"
  },
  {
    "code": "branding:manage",
    "description": "Configurar la identidad visual institucional"
  },
  {
    "code": "campuses:manage",
    "description": "Administrar las sedes de la universidad y la sede de cada escuela"
  },
  {
    "code": "admonitions:read",
    "description": "Ver las amonestaciones a docentes tutores"
  },
  {
    "code": "admonitions:write",
    "description": "Registrar amonestaciones a docentes tutores"
  },
  {
    "code": "work-plans:write",
    "description": "Elaborar planes de trabajo semestrales"
  },
  {
    "code": "certificados:registrar",
    "description": "Iniciar el trámite de certificación de un docente tutor y reunir sus evidencias"
  },
  {
    "code": "certificados:aprobar",
    "description": "Revisar las evidencias y aprobar, observar o rechazar un certificado de tutoría"
  },
  {
    "code": "certificados:emitir",
    "description": "Generar el certificado de tutoría sin firma y asignarle su número de registro"
  },
  {
    "code": "certificados:consultar",
    "description": "Ver los trámites de certificación de tutoría de las escuelas dentro del alcance"
  },
  {
    "code": "certificados:descargar",
    "description": "Descargar el PDF del certificado de tutoría"
  },
  {
    "code": "certificados:administrar",
    "description": "Anular certificados de tutoría y administrar sus plantillas y resoluciones"
  }
] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];
const permissionCodes: ReadonlySet<string> = new Set(PERMISSION_CATALOG.map((permission) => permission.code));
export function isPermissionCode(value: string): value is PermissionCode {
  return permissionCodes.has(value);
}
