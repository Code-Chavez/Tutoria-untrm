import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { findParameterDefinition, ParameterDefinition, PARAMETER_DEFINITIONS } from './parameterDefinitions';

export class UnknownParameterError extends Error {
  constructor() {
    super('El parámetro indicado no existe o no es editable');
    this.name = 'UnknownParameterError';
  }
}

export class InvalidParameterValueError extends Error {
  constructor(definition: ParameterDefinition) {
    super(`${definition.label}: ingresa un número entero entre ${definition.min} y ${definition.max} ${definition.unit}`);
    this.name = 'InvalidParameterValueError';
  }
}

export interface SystemParameterView extends ParameterDefinition {
  value: number;
  /** true cuando no hay un valor guardado y rige el predeterminado. */
  isDefault: boolean;
}

/** Parámetros editables con su valor vigente (el guardado o, si falta, el predeterminado). */
export class ListSystemParametersUseCase {
  constructor(private readonly parameters: SystemParameterRepository) {}

  async execute(): Promise<SystemParameterView[]> {
    const stored = new Map((await this.parameters.findAll()).map((p) => [p.key, p.value]));
    return PARAMETER_DEFINITIONS.map((definition) => {
      const parsed = Number(stored.get(definition.key));
      const valid = stored.has(definition.key) && Number.isInteger(parsed) && parsed >= definition.min && parsed <= definition.max;
      return { ...definition, value: valid ? parsed : definition.defaultValue, isDefault: !valid };
    });
  }
}

/**
 * Cambia un parámetro (HU-49). Valida contra el rango de su definición y deja
 * en la bitácora quién lo cambió y de qué valor a cuál. El nuevo valor rige de
 * inmediato para lo que se cree o consulte desde ese momento.
 */
export class UpdateSystemParameterUseCase {
  constructor(
    private readonly parameters: SystemParameterRepository,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, key: string, rawValue: unknown): Promise<SystemParameterView> {
    const definition = findParameterDefinition(key);
    if (!definition) throw new UnknownParameterError();

    const value = typeof rawValue === 'string' ? Number(rawValue) : rawValue;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < definition.min || value > definition.max) {
      throw new InvalidParameterValueError(definition);
    }

    const existing = await this.parameters.findByKey(key);
    if (existing) {
      await this.parameters.update(key, String(value));
    } else {
      await this.parameters.create({ key, value: String(value), label: definition.label });
    }

    await this.auditLogs.create({
      userId: requesterId,
      action: 'UPDATE_PARAMETER',
      entity: 'SystemParameter',
      entityId: key,
      details: `${existing?.value ?? `${definition.defaultValue} (predeterminado)`} → ${value}`,
      ipAddress: null,
    });

    return { ...definition, value, isDefault: false };
  }
}
