import { ReferralStatus, StudentReferral } from '@domain/entities/StudentReferral';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ReferralForbiddenError } from './ReferralErrors';

/**
 * Política única de acceso a una derivación (Art. 9.a, 14.c y 22 del
 * Protocolo): la usan el detalle, la constancia en PDF y el cambio de estado,
 * de modo que ninguna ruta pueda saltarse una regla que otra sí aplica.
 */
export interface ReferralActor {
  id: string;
  roleName: string;
  /** Servicio del Profesional de Servicio; null para los demás roles. */
  service: string | null;
}

export async function resolveReferralActor(
  users: UserRepository,
  roles: RoleRepository,
  userId: string,
): Promise<ReferralActor> {
  const user = await users.findById(userId);
  if (!user || user.isActive === false) throw new ReferralForbiddenError();
  const role = await roles.findById(user.roleId);
  if (!role) throw new ReferralForbiddenError();
  return { id: user.id, roleName: role.name, service: user.service ?? null };
}

const isServiceOf = (actor: ReferralActor, referral: StudentReferral) =>
  actor.roleName === 'Profesional de Servicio' && actor.service !== null && actor.service === referral.service;

/** Quién puede ver el caso: la DBU, el tutor que lo emitió y el profesional del servicio destino. */
export function canViewReferral(actor: ReferralActor, referral: StudentReferral): boolean {
  if (actor.roleName === 'Administrador DBU') return true;
  if (actor.roleName === 'Docente Tutor') return referral.referredById === actor.id;
  return isServiceOf(actor, referral);
}

/**
 * Quién gestiona el caso (recibir, atender, cerrar): la DBU y el profesional
 * del servicio al que se derivó. El tutor emisor lo consulta, pero no registra
 * la atención de otro servicio.
 */
export function canManageReferral(actor: ReferralActor, referral: StudentReferral): boolean {
  return actor.roleName === 'Administrador DBU' || isServiceOf(actor, referral);
}

/** El estado solo avanza: ENVIADO → RECIBIDO → EN_ATENCION → ATENDIDO → CERRADO (se admite saltar etapas, no retroceder). */
const STATUS_ORDER: readonly ReferralStatus[] = ['ENVIADO', 'RECIBIDO', 'EN_ATENCION', 'ATENDIDO', 'CERRADO'];

export function isForwardTransition(from: string, to: string): boolean {
  const a = STATUS_ORDER.indexOf(from as ReferralStatus);
  const b = STATUS_ORDER.indexOf(to as ReferralStatus);
  return a !== -1 && b !== -1 && b > a;
}

/**
 * Vista de la derivación según la audiencia. Las notas de atención son de uso
 * interno del servicio: el tutor emisor ve el estado y las fechas, pero no el
 * contenido de las notas. Se quitan del cuerpo de la respuesta, no de la pantalla.
 */
export function toReferralView(referral: StudentReferral, actor: ReferralActor): StudentReferral {
  if (canManageReferral(actor, referral)) return referral;
  return {
    ...referral,
    statusHistory: referral.statusHistory?.map((entry) => ({ ...entry, notes: null })),
  };
}
