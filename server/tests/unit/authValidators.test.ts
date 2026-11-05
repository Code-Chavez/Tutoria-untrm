import { loginSchema, forgotPasswordSchema } from '@interfaces/http/validators/auth.validators';

// Mensajes de los campos obligatorios: solo cuando el campo falta (como con zod 3 y `required_error`); un valor de otro tipo no
// recibe el mensaje de «obligatorio». Se fija al pasar a zod 4, donde esa opción cambió de forma.
describe('validadores de autenticación: mensajes de campo obligatorio', () => {
  const messages = (result: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
    (result.error?.issues ?? []).map((i) => `${String(i.path[0])}: ${i.message}`);

  it('un campo ausente dice que es obligatorio', () => {
    expect(messages(loginSchema.safeParse({}))).toEqual(expect.arrayContaining(['email: El email es obligatorio', 'password: La contraseña es obligatoria']));
    expect(messages(forgotPasswordSchema.safeParse({}))).toEqual(expect.arrayContaining(['email: El email es obligatorio']));
  });

  it('un valor de otro tipo no se presenta como «obligatorio»', () => {
    const msgs = messages(loginSchema.safeParse({ email: 123, password: 456 }));
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.join(' ')).not.toMatch(/obligatori/);
  });

  it('un login válido se acepta y el correo se normaliza', () => {
    const parsed = loginSchema.safeParse({ email: ' Ana@UNTRM.edu.pe ', password: 'Demo2026!' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.email).toBe('ana@untrm.edu.pe');
  });
});
