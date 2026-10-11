import { REFERRAL_SERVICES } from '@domain/entities/StudentReferral';

/** Rol cuyo acceso a los casos derivados depende del servicio al que pertenece la persona. */
export const SERVICE_ROLE_NAME = 'Profesional de Servicio';

export class ServiceRequiredError extends Error {
  constructor() {
    super('Elija el servicio al que pertenece el profesional (Escuela, Psicopedagogía, Psicología, Asistencia Social o Salud).');
    this.name = 'ServiceRequiredError';
  }
}

/**
 * Servicio que corresponde guardar según el rol. Un Profesional de Servicio sin servicio no vería ni recibiría
 * ninguna derivación, así que se exige; para los demás roles el servicio no tiene sentido y se descarta.
 */
export function resolveService(roleName: string, service: string | null | undefined): string | null {
  if (roleName !== SERVICE_ROLE_NAME) return null;
  if (!service || !(REFERRAL_SERVICES as readonly string[]).includes(service)) throw new ServiceRequiredError();
  return service;
}
