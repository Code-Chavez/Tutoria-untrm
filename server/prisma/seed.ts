import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Contraseña compartida por todas las cuentas de prueba (no la del admin).
const DEMO_PASSWORD = 'Demo2026!';

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
    [coordRole.id]: ['users:read', 'students:read', 'students:write', 'students:import', 'interviews:read', 'followups:read', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'referrals:read', 'reports:read', 'reports:export', 'evaluation:manage'],
    [tutorRole.id]: ['students:read', 'interviews:read', 'interviews:write', 'followups:read', 'followups:write', 'support-contacts:read', 'support-contacts:write', 'tutoring-requests:read', 'tutoring-requests:write', 'sessions:read', 'sessions:write', 'referrals:read', 'referrals:write', 'reports:read', 'reports:export'],
    [studentRole.id]: ['sessions:read', 'evaluation:respond', 'tutoring-requests:self'],
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

  // Usuario administrador por defecto (credenciales productivas, no tocar)
  const adminPasswordHash = await bcrypt.hash('Admin2026!', 12);
  await prisma.user.upsert({
    where: { email: '7183255722@untrm.edu.pe' },
    update: {},
    create: {
      email: '7183255722@untrm.edu.pe',
      passwordHash: adminPasswordHash,
      firstName: 'Administrador',
      lastName: 'SIT',
      roleId: adminRole.id,
    },
  });

  // ── Usuarios de prueba (uno o más por rol, para pruebas manuales) ──────
  // Todos comparten DEMO_PASSWORD ('Demo2026!'); se listan al final del seed.
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUsersInput: { email: string; firstName: string; lastName: string; phone: string; roleId: string }[] = [
    // Coordinador
    { email: 'rosa.mendoza@untrm.edu.pe', firstName: 'Rosa', lastName: 'Mendoza Vargas', phone: '941000001', roleId: coordRole.id },
    { email: 'carlos.vega@untrm.edu.pe', firstName: 'Carlos', lastName: 'Vega Ramos', phone: '941000002', roleId: coordRole.id },
    // Docente Tutor (varios, para probar la asignación masiva y su carga)
    { email: 'elena.ramirez@untrm.edu.pe', firstName: 'Elena', lastName: 'Ramírez Chávez', phone: '941000003', roleId: tutorRole.id },
    { email: 'jorge.salazar@untrm.edu.pe', firstName: 'Jorge', lastName: 'Salazar Puertas', phone: '941000004', roleId: tutorRole.id },
    { email: 'patricia.nunez@untrm.edu.pe', firstName: 'Patricia', lastName: 'Núñez Ortiz', phone: '941000005', roleId: tutorRole.id },
    { email: 'miguel.torres@untrm.edu.pe', firstName: 'Miguel', lastName: 'Torres Guevara', phone: '941000006', roleId: tutorRole.id },
    // Profesional de Servicio
    { email: 'lucia.flores@untrm.edu.pe', firstName: 'Lucía', lastName: 'Flores Bardales', phone: '941000007', roleId: serviceRole.id, service: 'PSICOLOGIA' },
    { email: 'ronald.diaz@untrm.edu.pe', firstName: 'Ronald', lastName: 'Díaz Cabrera', phone: '941000008', roleId: serviceRole.id, service: 'SALUD' },
    // Vicerrectorado
    { email: 'vicerrectorado.academico@untrm.edu.pe', firstName: 'Segundo', lastName: 'Ortiz Fernández', phone: '941000009', roleId: viceRole.id },
    // Tutorado (cuentas de estudiante que inician sesión en el sistema)
    { email: '20191234@untrm.edu.pe', firstName: 'Ana', lastName: 'Torres Ramos', phone: '941000010', roleId: studentRole.id },
    { email: '20195678@untrm.edu.pe', firstName: 'Luis', lastName: 'Pérez Huamán', phone: '941000011', roleId: studentRole.id },
  ];

  const demoUsers = new Map<string, string>(); // email -> user id
  for (const u of demoUsersInput) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: demoPasswordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        roleId: u.roleId,
        service: (u as any).service || null,
      },
    });
    demoUsers.set(u.email, user.id);
  }

  const tutorIds = [
    demoUsers.get('elena.ramirez@untrm.edu.pe')!,
    demoUsers.get('jorge.salazar@untrm.edu.pe')!,
    demoUsers.get('patricia.nunez@untrm.edu.pe')!,
    demoUsers.get('miguel.torres@untrm.edu.pe')!,
  ];

  // Facultades y escuelas de ejemplo
  const fisme = await prisma.faculty.upsert({
    where: { name: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica' },
    update: {},
    create: { name: 'Facultad de Ingeniería de Sistemas y Mecánica Eléctrica' },
  });

  const fcea = await prisma.faculty.upsert({
    where: { name: 'Facultad de Ciencias Económicas y Administrativas' },
    update: {},
    create: { name: 'Facultad de Ciencias Económicas y Administrativas' },
  });

  // Coordinadores por escuela (Art. 17.a); Administración de Empresas se deja
  // sin coordinador a propósito, para ejercitar el respaldo a Administrador
  // DBU al enrutar solicitudes de tutoría (HU-17).
  const coordSistemasId = demoUsers.get('rosa.mendoza@untrm.edu.pe');
  const coordMecanicaId = demoUsers.get('carlos.vega@untrm.edu.pe');

  const schoolSistemas = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería de Sistemas', facultyId: fisme.id } },
    update: { coordinatorId: coordSistemasId },
    create: { name: 'Ingeniería de Sistemas', facultyId: fisme.id, coordinatorId: coordSistemasId },
  });

  const schoolMecanica = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id } },
    update: { coordinatorId: coordMecanicaId },
    create: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id, coordinatorId: coordMecanicaId },
  });

  const schoolAdmin = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Administración de Empresas', facultyId: fcea.id } },
    update: {},
    create: { name: 'Administración de Empresas', facultyId: fcea.id },
  });

  // Periodo académico
  await prisma.academicPeriod.upsert({
    where: { name: '2026-II' },
    update: {},
    create: { name: '2026-II', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-20') },
  });

  // ── Tutorados de prueba (mezcla de escuelas, ciclos, riesgo y asignación) ──
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const studentsInput: {
    studentCode: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    cycle: number;
    schoolId: string;
    isAtRisk?: boolean;
    riskReason?: string;
    isActive?: boolean;
    tutorId?: string;
    assignedAt?: Date;
  }[] = [
    { studentCode: '20191234', firstName: 'Ana', lastName: 'Torres Ramos', email: '20191234@untrm.edu.pe', phone: '987000001', cycle: 5, schoolId: schoolSistemas.id, tutorId: tutorIds[0], assignedAt: daysAgo(30) },
    { studentCode: '20195678', firstName: 'Luis', lastName: 'Pérez Huamán', email: '20195678@untrm.edu.pe', phone: '987000002', cycle: 3, schoolId: schoolSistemas.id, tutorId: tutorIds[0], assignedAt: daysAgo(30) },
    { studentCode: '20201122', firstName: 'María', lastName: 'Cruz Delgado', phone: '987000003', cycle: 7, schoolId: schoolSistemas.id, isAtRisk: true, riskReason: 'Bajo rendimiento en dos cursos consecutivos', tutorId: tutorIds[1], assignedAt: daysAgo(20) },
    { studentCode: '20203344', firstName: 'Jhon', lastName: 'Rojas Bardales', phone: '987000004', cycle: 2, schoolId: schoolSistemas.id, tutorId: tutorIds[1], assignedAt: daysAgo(20) },
    { studentCode: '20215566', firstName: 'Katherine', lastName: 'Vásquez León', phone: '987000005', cycle: 9, schoolId: schoolSistemas.id },
    { studentCode: '20217788', firstName: 'Deyvis', lastName: 'Chávez Caruajulca', phone: '987000006', cycle: 4, schoolId: schoolMecanica.id, isAtRisk: true, riskReason: 'Inasistencias reiteradas superando el umbral permitido', tutorId: tutorIds[2], assignedAt: daysAgo(10) },
    { studentCode: '20229900', firstName: 'Fiorella', lastName: 'Guevara Sánchez', phone: '987000007', cycle: 6, schoolId: schoolMecanica.id, tutorId: tutorIds[2], assignedAt: daysAgo(10) },
    { studentCode: '20221011', firstName: 'Brayan', lastName: 'Huamán Torres', phone: '987000008', cycle: 1, schoolId: schoolMecanica.id },
    { studentCode: '20231213', firstName: 'Silvia', lastName: 'Ortiz Rivera', phone: '987000009', cycle: 8, schoolId: schoolAdmin.id, tutorId: tutorIds[3], assignedAt: daysAgo(5) },
    { studentCode: '20231415', firstName: 'Diego', lastName: 'Fernández Puertas', phone: '987000010', cycle: 3, schoolId: schoolAdmin.id },
    { studentCode: '20241617', firstName: 'Gabriela', lastName: 'Ramos Núñez', phone: '987000011', cycle: 2, schoolId: schoolAdmin.id, isAtRisk: true, riskReason: 'Situación personal-emocional en seguimiento', tutorId: tutorIds[3], assignedAt: daysAgo(5) },
    { studentCode: '20191819', firstName: 'Estefany', lastName: 'Bardales Cabrera', phone: '987000012', cycle: 10, schoolId: schoolSistemas.id, isActive: false },
  ];

  for (const s of studentsInput) {
    await prisma.student.upsert({
      where: { studentCode: s.studentCode },
      update: {},
      create: {
        studentCode: s.studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email ?? null,
        phone: s.phone ?? null,
        cycle: s.cycle,
        schoolId: s.schoolId,
        isAtRisk: s.isAtRisk ?? false,
        riskReason: s.isAtRisk ? s.riskReason ?? null : null,
        riskMarkedAt: s.isAtRisk ? daysAgo(3) : null,
        isActive: s.isActive ?? true,
        tutorId: s.tutorId ?? null,
        assignedAt: s.assignedAt ?? null,
      },
    });
  }

  // Vincula las cuentas Tutorado de prueba a su propio registro de estudiante
  // (mismo studentCode que su correo institucional), habilitando el
  // autoservicio de solicitud de tutoría desde su cuenta.
  const portalLinks: { studentCode: string; email: string }[] = [
    { studentCode: '20191234', email: '20191234@untrm.edu.pe' },
    { studentCode: '20195678', email: '20195678@untrm.edu.pe' },
  ];
  for (const link of portalLinks) {
    const userId = demoUsers.get(link.email);
    if (userId) {
      await prisma.student.update({
        where: { studentCode: link.studentCode },
        data: { userId },
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
  ];

  for (const p of params) {
    await prisma.systemParameter.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
  }

  console.log('Seed completed successfully');
  console.log('');
  console.log('Cuentas de prueba (todas con contraseña: %s):', DEMO_PASSWORD);
  for (const u of demoUsersInput) {
    console.log(`  - ${u.email}`);
  }
  console.log('  (Administrador: 7183255722@untrm.edu.pe / Admin2026!)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
