import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { findParameterDefinition } from './parameterDefinitions';

export interface SecurityPolicy {
  idleTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
}

function valueOf(stored: Map<string, string>, key: string): number {
  const definition = findParameterDefinition(key);
  if (!definition) throw new Error(`Parámetro sin definición: ${key}`);
  const parsed = Number(stored.get(key));
  const valid = stored.has(key) && Number.isInteger(parsed) && parsed >= definition.min && parsed <= definition.max;
  return valid ? parsed : definition.defaultValue;
}

/**
 * Política de acceso vigente. La fuente es la tabla de parámetros que edita la DBU; un valor ausente o fuera del rango
 * de su definición se ignora y rige el predeterminado, de modo que un dato mal guardado nunca desactiva un control.
 */
export async function loadSecurityPolicy(parameters: SystemParameterRepository): Promise<SecurityPolicy> {
  const stored = new Map((await parameters.findAll()).map((p) => [p.key, p.value]));
  return {
    idleTimeoutMinutes: valueOf(stored, 'inactivity_timeout_minutes'),
    maxLoginAttempts: valueOf(stored, 'login_max_attempts'),
    lockoutMinutes: valueOf(stored, 'login_lockout_minutes'),
  };
}
