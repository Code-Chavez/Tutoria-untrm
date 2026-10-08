import { PrismaClient } from '@prisma/client';

/**
 * Datos base que el sistema necesita en cualquier entorno (producción incluida): permisos, roles con sus
 * permisos y parámetros del sistema. Es idempotente (todo son upserts) y NO crea usuarios, estudiantes
 * ni datos de ejemplo.
 */
export async function seedBase(prisma: PrismaClient) {
  // Permisos base
  const permissions = await Promise.all([
    prisma.permission.upsert({ where: { code: 'users:read' }, update: {}, create: { code: 'users:read', description: 'Ver usuarios' } }),
    prisma.permission.upsert({ where: { code: 'users:write' }, update: {}, create: { code: 'users:write', description: 'Crear/editar usuarios' } }),
    prisma.permission.upsert({ where: { code: 'users:delete' }, update: {}, create: { code: 'users:delete', description: 'Desactivar usuarios' } }),
    prisma.permission.upsert({ where: { code: 'students:read' }, update: {}, create: { code: 'students:read', description: 'Ver tutorados' } }),
    prisma.permission.upsert({ where: { code: 'students:write' }, update: {}, create: { code: 'students:write', description: 'Crear/editar tutorados' } }),
    prisma.permission.upsert({ where: { code: 'students:import' }, update: {}, create: { code: 'students:import', description: 'Carga masiva de tutorados' } }),
    prisma.permission.upsert({ where: { code: 'interviews:read' }, update: {}, create: { code: 'interviews:read', description: 'Ver entrevistas iniciales' } }),
    prisma.permission.upsert({ where: { code: 'interviews:write' }, update: {}, create: { code: 'interviews:write', description: 'Registrar entrevistas iniciales' } }),
    prisma.permission.upsert({ where: { code: 'followups:read' }, update: {}, create: { code: 'followups:read', description: 'Ver fichas de seguimiento' } }),
    prisma.permission.upsert({ where: { code: 'followups:write' }, update: {}, create: { code: 'followups:write', description: 'Registrar fichas de seguimiento' } }),
    prisma.permission.upsert({ where: { code: 'support-contacts:read' }, update: {}, create: { code: 'support-contacts:read', description: 'Ver persona de red de apoyo' } }),
    prisma.permission.upsert({ where: { code: 'support-contacts:write' }, update: {}, create: { code: 'support-contacts:write', description: 'Registrar persona de red de apoyo' } }),
    prisma.permission.upsert({ where: { code: 'tutoring-requests:read' }, update: {}, create: { code: 'tutoring-requests:read', description: 'Ver solicitudes de tutoría' } }),
    prisma.permission.upsert({ where: { code: 'tutoring-requests:write' }, update: {}, create: { code: 'tutoring-requests:write', description: 'Registrar solicitudes de tutoría' } }),
    prisma.permission.upsert({ where: { code: 'tutoring-requests:self' }, update: {}, create: { code: 'tutoring-requests:self', description: 'Solicitar tutoría para sí mismo (autoservicio)' } }),
    prisma.permission.upsert({ where: { code: 'sessions:read' }, update: {}, create: { code: 'sessions:read', description: 'Ver sesiones' } }),
    prisma.permission.upsert({ where: { code: 'sessions:write' }, update: {}, create: { code: 'sessions:write', description: 'Programar sesiones' } }),
    prisma.permission.upsert({ where: { code: 'referrals:read' }, update: {}, create: { code: 'referrals:read', description: 'Ver derivaciones' } }),
    prisma.permission.upsert({ where: { code: 'referrals:write' }, update: {}, create: { code: 'referrals:write', description: 'Crear derivaciones' } }),
    prisma.permission.upsert({ where: { code: 'reports:read' }, update: {}, create: { code: 'reports:read', description: 'Ver reportes' } }),
    prisma.permission.upsert({ where: { code: 'reports:export' }, update: {}, create: { code: 'reports:export', description: 'Exportar reportes' } }),
    prisma.permission.upsert({ where: { code: 'audit:read' }, update: {}, create: { code: 'audit:read', description: 'Consultar bitácora' } }),
    prisma.permission.upsert({ where: { code: 'admin:system' }, update: {}, create: { code: 'admin:system', description: 'Administrar sistema' } }),
    prisma.permission.upsert({ where: { code: 'evaluation:respond' }, update: {}, create: { code: 'evaluation:respond', description: 'Responder evaluación' } }),
    prisma.permission.upsert({ where: { code: 'evaluation:manage' }, update: {}, create: { code: 'evaluation:manage', description: 'Gestionar evaluación' } }),
    prisma.permission.upsert({ where: { code: 'work-plans:read' }, update: {}, create: { code: 'work-plans:read', description: 'Ver planes de trabajo semestrales' } }),
    prisma.permission.upsert({ where: { code: 'semester-reports:write' }, update: {}, create: { code: 'semester-reports:write', description: 'Elaborar el informe semestral de tutoría propio' } }),
    prisma.permission.upsert({ where: { code: 'consolidated-reports:read' }, update: {}, create: { code: 'consolidated-reports:read', description: 'Ver el informe consolidado por escuela y facultad' } }),
    prisma.permission.upsert({ where: { code: 'indicators:read' }, update: {}, create: { code: 'indicators:read', description: 'Ver el tablero de indicadores' } }),
    prisma.permission.upsert({ where: { code: 'catalogs:manage' }, update: {}, create: { code: 'catalogs:manage', description: 'Administrar los catálogos maestros' } }),
    prisma.permission.upsert({ where: { code: 'parameters:manage' }, update: {}, create: { code: 'parameters:manage', description: 'Administrar los parámetros del sistema' } }),
    prisma.permission.upsert({ where: { code: 'branding:manage' }, update: {}, create: { code: 'branding:manage', description: 'Configurar la identidad visual institucional' } }),
    prisma.permission.upsert({ where: { code: 'work-plans:write' }, update: {}, create: { code: 'work-plans:write', description: 'Elaborar planes de trabajo semestrales' } }),
  ]);

  const permMap = Object.fromEntries(permissions.map(p => [p.code, p.id]));

  // Roles del sistema (Art. 4 del Protocolo)
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador DBU' },
    update: {},
    create: { name: 'Administrador DBU', description: 'Administrador de la Dirección de Bienestar Universitario' },
  });

  const coordRole = await prisma.role.upsert({
    where: { name: 'Coordinador' },
    update: {},
    create: { name: 'Coordinador', description: 'Coordinador de tutoría de escuela profesional' },
  });

  const tutorRole = await prisma.role.upsert({
    where: { name: 'Docente Tutor' },
    update: {},
    create: { name: 'Docente Tutor', description: 'Docente tutor asignado a estudiantes' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'Tutorado' },
    update: {},
    create: { name: 'Tutorado', description: 'Estudiante tutorado' },
  });

  const serviceRole = await prisma.role.upsert({
    where: { name: 'Profesional de Servicio' },
    update: {},
    create: { name: 'Profesional de Servicio', description: 'Profesional de servicio especializado (Psicología, etc.)' },
  });

  const viceRole = await prisma.role.upsert({
    where: { name: 'Vicerrectorado' },
    update: {},
    create: { name: 'Vicerrectorado', description: 'Vicerrectorado académico (solo lectura)' },
  });

  // Asignar permisos a roles
  const rolePerms: Record<string, string[]> = {
    [adminRole.id]: Object.keys(permMap),
    [coordRole.id]: ['users:read', 'students:read', 'students:write', 'students:import', 'interviews:read', 'followups:read', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'referrals:read', 'reports:read', 'reports:export', 'evaluation:manage', 'work-plans:read', 'work-plans:write', 'indicators:read'],
    [tutorRole.id]: ['students:read', 'interviews:read', 'interviews:write', 'followups:read', 'followups:write', 'support-contacts:read', 'support-contacts:write', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'sessions:write', 'referrals:read', 'referrals:write', 'reports:read', 'reports:export', 'semester-reports:write'],
    [studentRole.id]: ['sessions:read', 'evaluation:respond', 'tutoring-requests:self'],
    [serviceRole.id]: ['referrals:read', 'referrals:write'],
    [viceRole.id]: ['reports:read', 'consolidated-reports:read', 'indicators:read'],
  };

  for (const [roleId, codes] of Object.entries(rolePerms)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permMap[code] } },
        update: {},
        create: { roleId, permissionId: permMap[code] },
      });
    }
  }

  // Parámetros del sistema
  const params = [
    { key: 'session_duration_minutes', value: '45', label: 'Duración de sesión (minutos)' },
    { key: 'max_sessions_per_semester', value: '8', label: 'Máximo de sesiones por semestre' },
    { key: 'absence_alert_threshold', value: '2', label: 'Umbral de alerta por inasistencias' },
    { key: 'inactivity_timeout_minutes', value: '30', label: 'Tiempo de inactividad (minutos)' },
    { key: 'login_max_attempts', value: '3', label: 'Intentos de login antes de bloqueo' },
    { key: 'login_lockout_minutes', value: '15', label: 'Duración del bloqueo (minutos)' },
    { key: 'referral_followup_deadline_hours', value: '48', label: 'Plazo de atención de derivaciones (horas, Art. 22.b)' },
  ];

  for (const p of params) {
    await prisma.systemParameter.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  return { permMap, adminRole, coordRole, tutorRole, studentRole, serviceRole, viceRole };
}
