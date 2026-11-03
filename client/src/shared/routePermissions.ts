/**
 * Permiso del catálogo que abre cada pantalla (el mismo que exige el servidor a su API principal). Lo usan el menú, las pestañas
 * y las rutas para las cuentas con un rol personalizado, que no tienen un código de rol conocido. Los siete roles base siguen
 * viéndose por su rol, como siempre. Con varios permisos basta uno. Es solo comodidad del cliente: el servidor autoriza cada llamada.
 */
export const ROUTE_PERMISSIONS = {
  '/informes': ['reports:read'],
  '/informes/semestral': ['semester-reports:write'],
  '/informes/consolidado': ['consolidated-reports:read'],
  '/indicadores': ['indicators:read'],
  '/evaluacion/resultados': ['evaluation:manage'],
  '/evaluacion/sugerencias': ['evaluation:manage'],
  '/pedir-listas': ['students:import'],
  '/carga-masiva': ['students:import'],
  '/carga-docentes': ['users:write'],
  '/asignacion': ['students:write'],
  '/cierre-periodo': ['catalogs:manage'],
  '/pendientes': ['students:write'],
  '/correos-escuelas': ['students:import'],
  '/sedes': ['campuses:manage'],
  '/evaluacion/configuracion': ['evaluation:manage'],
  '/catalogos': ['catalogs:manage'],
  '/users': ['users:read'],
  '/roles': ['admin:system'],
  '/parametros': ['parameters:manage'],
  '/identidad': ['branding:manage'],
  '/auditoria': ['audit:read'],
  '/amonestaciones': ['admonitions:read'],
  '/plan-semestral': ['work-plans:read'],
  '/tutorados': ['students:read'],
  '/sesiones': ['sessions:read'],
  '/solicitudes': ['tutoring-requests:read'],
  '/derivaciones': ['referrals:read'],
} as const satisfies Record<string, readonly string[]>;

export type RoutePermissionPath = keyof typeof ROUTE_PERMISSIONS;

/** Quien tiene al menos uno de los permisos pedidos. */
export const hasAnyPermission = (granted: readonly string[] | undefined, wanted: readonly string[] | undefined): boolean =>
  !!wanted && !!granted && wanted.some((code) => granted.includes(code));
