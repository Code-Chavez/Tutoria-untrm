import { loadSecurityPolicy } from '@application/use-cases/system-parameters/securityPolicy';
import { PARAMETER_DEFINITIONS } from '@application/use-cases/system-parameters/parameterDefinitions';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';

const repo = (entries: Record<string, string>) =>
  ({ findAll: jest.fn().mockResolvedValue(Object.entries(entries).map(([key, value]) => ({ id: key, key, value, label: key }))) }) as unknown as SystemParameterRepository;

describe('loadSecurityPolicy (A08)', () => {
  it('sin valores guardados rigen los predeterminados', async () => {
    expect(await loadSecurityPolicy(repo({}))).toEqual({ idleTimeoutMinutes: 15, maxLoginAttempts: 5, lockoutMinutes: 15 });
  });

  it('usa los valores guardados dentro de su rango', async () => {
    const policy = await loadSecurityPolicy(repo({ inactivity_timeout_minutes: '30', login_max_attempts: '4', login_lockout_minutes: '10' }));

    expect(policy).toEqual({ idleTimeoutMinutes: 30, maxLoginAttempts: 4, lockoutMinutes: 10 });
  });

  it.each([
    ['inactivity_timeout_minutes', '1'],
    ['inactivity_timeout_minutes', '100000'],
    ['login_max_attempts', '0'],
    ['login_max_attempts', '2.5'],
    ['login_lockout_minutes', '-5'],
    ['login_lockout_minutes', ''],
  ])('ignora %s = «%s» (fuera de rango o no entero) y mantiene el predeterminado', async (key, value) => {
    const policy = await loadSecurityPolicy(repo({ [key]: value }));
    const defaults = { inactivity_timeout_minutes: 15, login_max_attempts: 5, login_lockout_minutes: 15 } as Record<string, number>;
    const actual = { inactivity_timeout_minutes: policy.idleTimeoutMinutes, login_max_attempts: policy.maxLoginAttempts, login_lockout_minutes: policy.lockoutMinutes } as Record<string, number>;

    expect(actual[key]).toBe(defaults[key]);
  });

  it('los tres parámetros son editables por la DBU, en su propio grupo', () => {
    const security = PARAMETER_DEFINITIONS.filter((d) => d.group === 'Seguridad de acceso').map((d) => d.key);

    expect(security).toEqual(['inactivity_timeout_minutes', 'login_max_attempts', 'login_lockout_minutes']);
  });
});
