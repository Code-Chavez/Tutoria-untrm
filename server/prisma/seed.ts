import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedBase } from '../src/infrastructure/bootstrap/seedBase';

// Contraseña compartida por todas las cuentas de prueba (no la del admin).
const DEMO_PASSWORD = 'Demo2026!';

export interface SeedSummary {
  /** Cuentas de demostración que esta ejecución CREÓ (las que ya existían no se tocan). */
  users: number;
  /** Estudiantes de demostración que esta ejecución CREÓ. */
  students: number;
  /** Matrículas que esta ejecución CREÓ (solo de los estudiantes que creó). */
  enrollments: number;
}

/**
 * Datos de DEMOSTRACIÓN para desarrollo. Es una orden explícita (`pnpm run seed`), no parte del arranque del servidor.
 *
 * Solo CREA lo que falta: nunca modifica un dato que ya existe. Lo que se ajusta después de crear una fila (escuela del docente, facultad del
 * decano, vínculo del estudiante con su cuenta, matrícula) se aplica únicamente a las filas que ESTA ejecución creó. Así, correrlo otra vez sobre
 * un entorno con datos (coordinaciones, sedes, escuelas de docentes, vínculos y matrículas modificados, o estudiantes propios) no cambia nada.
 */
export async function seedDemo(prisma: PrismaClient, options: { bcryptRounds?: number; quiet?: boolean } = {}): Promise<SeedSummary> {
  const rounds = options.bcryptRounds ?? 12;
  const log = options.quiet ? () => undefined : (...args: unknown[]) => console.log(...args);
  log('Seeding database...');

  // Datos base compartidos con producción (permisos, roles y parámetros). Solo crea lo que falta.
  const { adminRole, coordRole, tutorRole, studentRole, serviceRole, viceRole, deanRole } = await seedBase(prisma);

  // Administrador de DESARROLLO con contraseña conocida. Producción no usa este seed: crea su primer
  // administrador con `bootstrap` y la contraseña que se defina en el despliegue.
  const adminPasswordHash = await bcrypt.hash('Admin2026!', rounds);
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
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, rounds);

  const demoUsersInput: { email: string; firstName: string; lastName: string; phone: string; roleId: string; service?: string }[] = [
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
    // Decano (de la facultad de Ingeniería de Sistemas y Mecánica Eléctrica)
    { email: 'decano.fisme@untrm.edu.pe', firstName: 'Héctor', lastName: 'Vargas Pizarro', phone: '941000013', roleId: deanRole.id },
    // Tutorado (cuentas de estudiante que inician sesión en el sistema)
    { email: '20191234@untrm.edu.pe', firstName: 'Ana', lastName: 'Torres Ramos', phone: '941000010', roleId: studentRole.id },
    { email: '20195678@untrm.edu.pe', firstName: 'Luis', lastName: 'Pérez Huamán', phone: '941000011', roleId: studentRole.id },
  ];

  const demoUsers = new Map<string, string>(); // email -> user id
  const createdUsers = new Set<string>(); // correos de las cuentas que ESTA ejecución creó
  for (const u of demoUsersInput) {
    const existed = (await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } })) !== null;
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
    if (!existed) createdUsers.add(u.email);
  }

  const tutorEmails = ['elena.ramirez@untrm.edu.pe', 'jorge.salazar@untrm.edu.pe', 'patricia.nunez@untrm.edu.pe', 'miguel.torres@untrm.edu.pe'];
  const tutorIds = tutorEmails.map((email) => demoUsers.get(email)!);

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

  // El decano de la seed pertenece a su facultad: solo si esta ejecución creó la cuenta.
  if (createdUsers.has('decano.fisme@untrm.edu.pe')) {
    await prisma.user.update({ where: { email: 'decano.fisme@untrm.edu.pe' }, data: { facultyId: fisme.id } });
  }

  // Coordinadores por escuela (Art. 17.a); Administración de Empresas se deja
  // sin coordinador a propósito, para ejercitar el respaldo a Administrador
  // DBU al enrutar solicitudes de tutoría (HU-17).
  const coordSistemasId = demoUsers.get('rosa.mendoza@untrm.edu.pe');
  const coordMecanicaId = demoUsers.get('carlos.vega@untrm.edu.pe');

  // Sedes (la migración ya las crea; aquí se garantizan) y escuelas de ejemplo, todas en la sede central.
  // Las escuelas se crean con su coordinación y su sede, pero si ya existen NO se reescriben (`update: {}`).
  const campusCentral = await prisma.campus.upsert({ where: { name: 'Sede Central' }, update: {}, create: { name: 'Sede Central' } });
  await prisma.campus.upsert({ where: { name: 'Sede Bagua' }, update: {}, create: { name: 'Sede Bagua' } });
  await prisma.campus.upsert({ where: { name: 'Sede Utcubamba' }, update: {}, create: { name: 'Sede Utcubamba' } });

  const schoolSistemas = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería de Sistemas', facultyId: fisme.id } },
    update: {},
    create: { name: 'Ingeniería de Sistemas', facultyId: fisme.id, coordinatorId: coordSistemasId, campusId: campusCentral.id },
  });

  const schoolMecanica = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id } },
    update: {},
    create: { name: 'Ingeniería Mecánica Eléctrica', facultyId: fisme.id, coordinatorId: coordMecanicaId, campusId: campusCentral.id },
  });

  const schoolAdmin = await prisma.school.upsert({
    where: { name_facultyId: { name: 'Administración de Empresas', facultyId: fcea.id } },
    update: {},
    create: { name: 'Administración de Empresas', facultyId: fcea.id, campusId: campusCentral.id },
  });

  // Cada docente tutor pertenece a la escuela de sus tutorados: solo se asigna a las cuentas que esta ejecución creó.
  const tutorSchools = [schoolSistemas.id, schoolSistemas.id, schoolMecanica.id, schoolAdmin.id];
  for (let i = 0; i < tutorEmails.length; i++) {
    if (createdUsers.has(tutorEmails[i])) await prisma.user.update({ where: { id: tutorIds[i] }, data: { schoolId: tutorSchools[i] } });
  }

  // Periodo académico
  const period2026II = await prisma.academicPeriod.upsert({
    where: { name: '2026-II' },
    update: {},
    create: { name: '2026-II', startDate: new Date('2026-08-01'), endDate: new Date('2026-12-20') },
  });

  // Evaluación de tutoría habilitada para Ingeniería de Sistemas (HU-38):
  // las demás escuelas quedan cerradas hasta que la DBU las habilite.
  await prisma.evaluationWindow.upsert({
    where: { periodId_schoolId: { periodId: period2026II.id, schoolId: schoolSistemas.id } },
    update: {},
    create: { periodId: period2026II.id, schoolId: schoolSistemas.id, isOpen: true },
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

  const createdStudents: { id: string; code: string; schoolId: string; cycle: number; isActive: boolean }[] = []; // los que ESTA ejecución creó
  for (const s of studentsInput) {
    const existed = (await prisma.student.findUnique({ where: { studentCode: s.studentCode }, select: { id: true } })) !== null;
    const student = await prisma.student.upsert({
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
    if (!existed) createdStudents.push({ id: student.id, code: s.studentCode, schoolId: s.schoolId, cycle: s.cycle, isActive: s.isActive ?? true });
  }

  // Vincula las cuentas Tutorado de prueba a su propio registro de estudiante
  // (mismo studentCode que su correo institucional), habilitando el
  // autoservicio de solicitud de tutoría desde su cuenta. Solo en los estudiantes que esta ejecución creó.
  const portalLinks: { studentCode: string; email: string }[] = [
    { studentCode: '20191234', email: '20191234@untrm.edu.pe' },
    { studentCode: '20195678', email: '20195678@untrm.edu.pe' },
  ];
  for (const link of portalLinks) {
    const userId = demoUsers.get(link.email);
    if (userId && createdStudents.some((s) => s.code === link.studentCode)) {
      await prisma.student.update({ where: { studentCode: link.studentCode }, data: { userId } });
    }
  }

  // Matrícula en el periodo vigente (sin ella no podrían solicitar tutoría ni evaluar): solo de los estudiantes activos que ESTA ejecución
  // creó. No se matricula a los demás estudiantes activos del entorno (no son de la seed).
  let enrollments = 0;
  for (const student of createdStudents.filter((s) => s.isActive)) {
    await prisma.periodEnrollment.upsert({
      where: { periodId_studentId: { periodId: period2026II.id, studentId: student.id } },
      update: {},
      create: { periodId: period2026II.id, studentId: student.id, schoolId: student.schoolId, cycle: student.cycle },
    });
    enrollments++;
  }

  const summary: SeedSummary = { users: createdUsers.size, students: createdStudents.length, enrollments };
  log(`Seed completed successfully: ${summary.users} cuentas, ${summary.students} estudiantes y ${summary.enrollments} matrículas creados; lo que ya existía no se modificó.`);
  log('');
  log('Cuentas de prueba (todas con contraseña: %s):', DEMO_PASSWORD);
  for (const u of demoUsersInput) {
    log(`  - ${u.email}`);
  }
  log('  (Administrador: 7183255722@untrm.edu.pe / Admin2026!)');
  return summary;
}

// Orden explícita (`pnpm run seed`): un fallo TERMINA CON ERROR y muestra la causa, para que ni el comando de preparación de la base de pruebas ni
// un script lo den por bueno (antes se registraba el error y el proceso salía con código 0).
if (require.main === module) {
  const prisma = new PrismaClient();
  seedDemo(prisma)
    .catch((error) => {
      console.error('El seed falló:', error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
