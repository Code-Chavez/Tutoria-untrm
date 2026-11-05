// Cuentas sembradas por el stack de desarrollo (ver docs/ACEPTACION_RELEASE_v0.4.0.md, paso 0).
export interface Account {
  email: string;
  password: string;
  role: string;
  greeting: string;
}

const DEMO = 'Demo2026!';

export const accounts = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!', role: 'Administrador DBU', greeting: 'Administrador' },
  coordinator: { email: 'rosa.mendoza@untrm.edu.pe', password: DEMO, role: 'Coordinador', greeting: 'Rosa' },
  tutor: { email: 'elena.ramirez@untrm.edu.pe', password: DEMO, role: 'Docente Tutor', greeting: 'Elena' },
  psychology: { email: 'lucia.flores@untrm.edu.pe', password: DEMO, role: 'Profesional de Servicio', greeting: 'Lucía' },
  vice: { email: 'vicerrectorado.academico@untrm.edu.pe', password: DEMO, role: 'Vicerrectorado', greeting: 'Segundo' },
  dean: { email: 'decano.fisme@untrm.edu.pe', password: DEMO, role: 'Decano', greeting: 'Héctor' },
  student: { email: '20191234@untrm.edu.pe', password: DEMO, role: 'Tutorado', greeting: 'Ana' },
} satisfies Record<string, Account>;

export type AccountKey = keyof typeof accounts;
