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
