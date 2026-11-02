import { PERMISSION_CATALOG } from '../../domain/permissionCatalog';
import { PrismaClient } from '@prisma/client';

/**
 * Datos base que el sistema necesita en cualquier entorno (producción incluida): permisos, roles con sus
 * permisos y parámetros del sistema. Es idempotente (todo son upserts) y NO crea usuarios, estudiantes
 * ni datos de ejemplo.
 */
export async function seedBase(prisma: PrismaClient) {
  // Permisos base
  const permissions = await Promise.all(PERMISSION_CATALOG.map((permission) =>
    prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: { ...permission },
    }),
  ));

  const permMap = Object.fromEntries(permissions.map(p => [p.code, p.id]));

  // Roles del sistema (Art. 4 del Protocolo)
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador DBU' },
    update: {},
    create: { isBase: true, name: 'Administrador DBU', description: 'Administrador de la Dirección de Bienestar Universitario' },
  });

  const coordRole = await prisma.role.upsert({
    where: { name: 'Coordinador' },
    update: {},
    create: { isBase: true, name: 'Coordinador', description: 'Coordinador de tutoría de escuela profesional' },
  });

  const tutorRole = await prisma.role.upsert({
    where: { name: 'Docente Tutor' },
    update: {},
    create: { isBase: true, name: 'Docente Tutor', description: 'Docente tutor asignado a estudiantes' },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'Tutorado' },
    update: {},
    create: { isBase: true, name: 'Tutorado', description: 'Estudiante tutorado' },
  });

  const serviceRole = await prisma.role.upsert({
    where: { name: 'Profesional de Servicio' },
    update: {},
    create: { isBase: true, name: 'Profesional de Servicio', description: 'Profesional de servicio especializado (Psicología, etc.)' },
  });

  const viceRole = await prisma.role.upsert({
    where: { name: 'Vicerrectorado' },
    update: {},
    create: { isBase: true, name: 'Vicerrectorado', description: 'Vicerrectorado académico (solo lectura)' },
  });

  const deanRole = await prisma.role.upsert({
    where: { name: 'Decano' },
    update: {},
    create: { isBase: true, name: 'Decano', description: 'Decano de facultad: amonesta a los docentes tutores de su facultad' },
  });

  // Asignar permisos a roles
  const rolePerms: Record<string, string[]> = {
    [adminRole.id]: Object.keys(permMap),
    [coordRole.id]: ['users:read', 'students:read', 'students:write', 'students:import', 'interviews:read', 'followups:read', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'referrals:read', 'reports:read', 'reports:export', 'evaluation:manage', 'work-plans:read', 'work-plans:write', 'indicators:read', 'admonitions:read'],
    [tutorRole.id]: ['students:read', 'interviews:read', 'interviews:write', 'followups:read', 'followups:write', 'support-contacts:read', 'support-contacts:write', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'sessions:write', 'referrals:read', 'referrals:write', 'reports:read', 'reports:export', 'semester-reports:write'],
    [studentRole.id]: ['sessions:read', 'evaluation:respond', 'tutoring-requests:self'],
    [serviceRole.id]: ['referrals:read', 'referrals:write'],
    [viceRole.id]: ['reports:read', 'consolidated-reports:read', 'indicators:read', 'campuses:manage'],
    [deanRole.id]: ['admonitions:read', 'admonitions:write'],
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
    { key: 'inactivity_timeout_minutes', value: '15', label: 'Tiempo de inactividad (minutos)' },
    { key: 'login_max_attempts', value: '5', label: 'Intentos de login antes de bloqueo' },
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

  return { permMap, adminRole, coordRole, tutorRole, studentRole, serviceRole, viceRole, deanRole };
}
