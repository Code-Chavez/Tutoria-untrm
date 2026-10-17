import http from 'http';
import ExcelJS from 'exceljs';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Alta masiva de docentes tutores desde Excel sobre HTTP real y base de datos real: crea las cuentas con su escuela y
 * invitación pendiente, informa lo que no pudo cargar, y solo la DBU puede hacerlo. Usa cuentas propias y las desactiva.
 * Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  coord: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const stamp = String(Date.now());
const GOOD = `import-tutor-${stamp}@untrm.edu.pe`;
const OTHER = `import-tutor-b-${stamp}@untrm.edu.pe`;

describe('alta masiva de docentes tutores', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;

  const upload = async (who: Who, rows: string[][]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Docentes');
    sheet.addRow(['nombres', 'apellidos', 'correo', 'telefono', 'escuela']);
    rows.forEach((r) => sheet.addRow(r));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'docentes.xlsx');
    return fetch(`${baseUrl}/api/tutors/import`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[who]}` }, body: form });
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de alta de docentes.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ACCOUNTS[who]) });
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) await prisma.user.updateMany({ where: { email: { in: [GOOD, OTHER] } }, data: { isActive: false } });
    await prisma.$disconnect();
  });

  it('crea las cuentas con su escuela y pendientes de activar, e informa las filas con error', async () => {
    if (!dbUp) return;
    const res = await upload('admin', [
      ['Docente', 'Importado Prueba', GOOD, '941000099', 'Ingeniería Mecánica Eléctrica'],
      ['Docente', 'Con Error', 'sin-arroba', '', 'Ingeniería de Sistemas'],
      ['Docente', 'Sin Escuela', OTHER, '', 'Escuela Que No Existe'],
    ]);

    expect(res.status).toBe(200);
    const { report } = (await res.json()) as { report: { created: number; skipped: number; errors: { row: number; message: string }[] } };
    expect(report).toMatchObject({ created: 1, skipped: 2 });
    expect(report.errors.map((e) => e.row).sort()).toEqual([3, 4]);

    const mecanica = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería Mecánica Eléctrica' } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: GOOD }, include: { role: true } });
    expect(user).toMatchObject({ schoolId: mecanica.id, mustChangePassword: true });
    expect(user.role.name).toBe('Docente Tutor');
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBeGreaterThan(0);
    expect(await prisma.user.count({ where: { email: OTHER } })).toBe(0);
  });

  it('volver a cargar el mismo archivo no duplica: la fila se informa como «ya existe»', async () => {
    if (!dbUp) return;
    const res = await upload('admin', [['Docente', 'Importado Prueba', GOOD, '', 'Ingeniería Mecánica Eléctrica']]);

    const { report } = (await res.json()) as { report: { created: number; errors: { message: string }[] } };
    expect(report.created).toBe(0);
    expect(report.errors[0].message).toMatch(/Ya existe una cuenta/);
  });

  it('solo la DBU: la coordinación no puede crear cuentas ni bajar la plantilla', async () => {
    if (!dbUp) return;
    expect((await upload('coord', [['A', 'B', OTHER, '', 'Ingeniería de Sistemas']])).status).toBe(403);
    expect((await fetch(`${baseUrl}/api/tutors/import/template`, { headers: { Authorization: `Bearer ${tokens.coord}` } })).status).toBe(403);
    const template = await fetch(`${baseUrl}/api/tutors/import/template`, { headers: { Authorization: `Bearer ${tokens.admin}` } });
    expect(template.status).toBe(200);
    expect(template.headers.get('content-disposition')).toMatch(/plantilla-docentes-tutores/);
  });
});
