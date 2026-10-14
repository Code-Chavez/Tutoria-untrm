import { expect } from '@playwright/test';
import { accounts } from './accounts';
import { api, apiLogin } from './api';

interface StudentRow {
  id: string;
  studentCode: string;
  tutorId: string | null;
}

export async function userId(adminToken: string, email: string): Promise<string> {
  const res = await api<{ users: { id: string; email: string }[] } | { id: string; email: string }[]>(adminToken, 'GET', '/users');
  const list = Array.isArray(res.body) ? res.body : res.body.users;
  const user = list.find((u) => u.email === email);
  expect(user, `usuario ${email}`).toBeTruthy();
  return user!.id;
}

/** Deja a Ana (20191234) con Elena como tutora, sin depender de lo que hayan hecho otras corridas. */
export async function ensureAnaWithElena(): Promise<{ adminToken: string; anaId: string; elenaId: string }> {
  const adminToken = await apiLogin(accounts.admin);
  const students = await api<{ students: StudentRow[] }>(adminToken, 'GET', '/students');
  const ana = students.body.students.find((s) => s.studentCode === '20191234');
  const elenaId = await userId(adminToken, accounts.tutor.email);
  expect(ana, 'Ana sembrada').toBeTruthy();
  if (ana!.tutorId !== elenaId) {
    const res = await api(adminToken, 'PATCH', `/students/${ana!.id}/reassign`, { newTutorId: elenaId, reason: 'Preparación de prueba E2E' });
    expect(res.status).toBe(200);
  }
  return { adminToken, anaId: ana!.id, elenaId };
}

/** Crea un tutorado nuevo (código único) en Ingeniería de Sistemas y lo asigna a Elena. */
export async function createStudentForElena(adminToken: string, elenaId: string): Promise<{ id: string; fullName: string }> {
  const schools = await api<{ schools: { id: string; name: string }[] } | { id: string; name: string }[]>(adminToken, 'GET', '/schools');
  const list = Array.isArray(schools.body) ? schools.body : schools.body.schools;
  const school = list.find((s) => /Sistemas/.test(s.name));
  expect(school, 'escuela de Sistemas').toBeTruthy();
  const code = String(Date.now()).slice(-8);
  const created = await api<{ student: { id: string } }>(adminToken, 'POST', '/students', {
    studentCode: code,
    firstName: 'Prueba',
    lastName: `E2E ${code}`,
    cycle: 3,
    schoolId: school!.id,
  });
  expect(created.status).toBe(201);
  const id = created.body.student.id;
  const assigned = await api(adminToken, 'POST', '/students/assign', { tutorId: elenaId, studentIds: [id] });
  expect(assigned.status).toBe(200);
  return { id, fullName: `Prueba E2E ${code}` };
}

/** Fecha local de hoy a la hora indicada, en ISO (las sesiones del recorrido caen siempre en el mes en curso). */
export function todayAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function dateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Crea un tutorado nuevo con cuenta de portal (rol Tutorado), asignado a Elena.
 * La cuenta nace con una clave temporal aleatoria (A01). Por defecto la prueba la cambia por la API para poder usar la
 * cuenta de inmediato; con `keepTemporary` devuelve la clave temporal tal como la recibió la DBU.
 */
export async function createPortalStudent(
  adminToken: string,
  elenaId: string,
  options: { keepTemporary?: boolean } = {},
): Promise<{ id: string; email: string; password: string; greeting: string }> {
  const student = await createStudentForElena(adminToken, elenaId);
  const roles = await api<{ roles: { id: string; name: string }[] } | { id: string; name: string }[]>(adminToken, 'GET', '/roles');
  const roleList = Array.isArray(roles.body) ? roles.body : roles.body.roles;
  const role = roleList.find((r) => r.name === 'Tutorado');
  expect(role, 'rol Tutorado').toBeTruthy();
  const email = `prueba.${student.fullName.split(' ').pop()}@untrm.edu.pe`;
  const user = await api<{ user: { id: string }; temporaryPassword: string }>(adminToken, 'POST', '/users', {
    email,
    firstName: 'Prueba',
    lastName: student.fullName.replace('Prueba ', ''),
    roleId: role!.id,
  });
  expect(user.status).toBe(201);
  const linked = await api(adminToken, 'PATCH', `/students/${student.id}/portal-account`, { userId: user.body.user.id });
  expect(linked.status).toBe(200);
  const temporary = user.body.temporaryPassword;
  if (options.keepTemporary) return { id: student.id, email, password: temporary, greeting: 'Prueba' };

  const password = 'Estudiante2026!';
  const own = await apiLogin({ email, password: temporary, role: 'Tutorado', greeting: 'Prueba' });
  const changed = await api(own, 'POST', '/profile/change-password', { currentPassword: temporary, newPassword: password });
  expect(changed.status).toBe(200);
  return { id: student.id, email, password, greeting: 'Prueba' };
}

/** Abre o cierra la evaluación de la escuela de Sistemas. */
export async function setSistemasEvaluationWindow(adminToken: string, isOpen: boolean): Promise<void> {
  const schools = await api<{ schools: { id: string; name: string }[] } | { id: string; name: string }[]>(adminToken, 'GET', '/schools');
  const list = Array.isArray(schools.body) ? schools.body : schools.body.schools;
  const school = list.find((s) => /Sistemas/.test(s.name));
  const res = await api(adminToken, 'PATCH', `/evaluation-windows/${school!.id}`, { isOpen });
  expect(res.status).toBe(200);
}
