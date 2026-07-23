import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Permisos base
  const permissions = await Promise.all([
    prisma.permission.upsert({ where: { code: 'users:read' }, update: {}, create: { code: 'users:read', description: 'Ver usuarios' } }),
    prisma.permission.upsert({ where: { code: 'users:write' }, update: {}, create: { code: 'users:write', description: 'Crear/editar usuarios' } }),
    prisma.permission.upsert({ where: { code: 'users:delete' }, update: {}, create: { code: 'users:delete', description: 'Desactivar usuarios' } }),
    prisma.permission.upsert({ where: { code: 'students:read' }, update: {}, create: { code: 'students:read', description: 'Ver tutorados' } }),
    prisma.permission.upsert({ where: { code: 'students:write' }, update: {}, create: { code: 'students:write', description: 'Crear/editar tutorados' } }),
    prisma.permission.upsert({ where: { code: 'students:import' }, update: {}, create: { code: 'students:import', description: 'Carga masiva de tutorados' } }),
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
    [coordRole.id]: ['users:read', 'students:read', 'students:write', 'students:import', 'sessions:read', 'referrals:read', 'reports:read', 'reports:export', 'evaluation:manage'],
    [tutorRole.id]: ['students:read', 'sessions:read', 'sessions:write', 'referrals:read', 'referrals:write', 'reports:read'],
    [studentRole.id]: ['sessions:read', 'evaluation:respond'],
    [serviceRole.id]: ['referrals:read', 'referrals:write'],
    [viceRole.id]: ['reports:read'],
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

  // Usuario administrador por defecto
  const passwordHash = await bcrypt.hash('Admin2026!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@untrm.edu.pe' },
    update: {},
    create: {
      email: 'admin@untrm.edu.pe',
      passwordHash,
      firstName: 'Administrador',
      lastName: 'SIT',
      roleId: adminRole.id,
    },
  });

  // Facultad y escuelas de ejemplo
  const fisme = await prisma.faculty.upsert({
    where: { name: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica' },
    update: {},
    create: { name: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica' },
  });

  await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería de Sistemas', facultyId: fisme.id } },
    update: {},
    create: { name: 'Ingeniería de Sistemas', facultyId: fisme.id },
  });

  await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id } },
    update: {},
    create: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id },
  });

  // Periodo académico
  await prisma.academicPeriod.upsert({
    where: { name: '2026-II' },
    update: {},
    create: { name: '2026-II', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-20') },
  });

  // Parámetros del sistema
  const params = [
    { key: 'session_duration_minutes', value: '45', label: 'Duración de sesión (minutos)' },
    { key: 'max_sessions_per_semester', value: '8', label: 'Máximo de sesiones por semestre' },
    { key: 'absence_alert_threshold', value: '2', label: 'Umbral de alerta por inasistencias' },
    { key: 'inactivity_timeout_minutes', value: '30', label: 'Tiempo de inactividad (minutos)' },
    { key: 'login_max_attempts', value: '3', label: 'Intentos de login antes de bloqueo' },
    { key: 'login_lockout_minutes', value: '15', label: 'Duración del bloqueo (minutos)' },
  ];

  for (const p of params) {
    await prisma.systemParameter.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
