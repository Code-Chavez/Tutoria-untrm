export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado en el sistema.`);
    this.name = 'DuplicateEmailError';
  }
}

/**
 * La operación dejaría al sistema sin ninguna cuenta de administración activa (HU de administración / LEV-R02). No se aplica ningún
 * cambio. Rige tanto al actuar sobre uno mismo como sobre otro usuario.
 */
export class LastActiveAdministratorError extends Error {
  constructor() {
    super('No se puede desactivar ni cambiar de rol a la última cuenta de administración activa. Active o asigne primero a otro administrador y vuelva a intentarlo.');
    this.name = 'LastActiveAdministratorError';
  }
}

/** El correo no tiene formato válido o no es de un dominio permitido para cuentas de usuario (RF-01). */
export class InvalidAccountEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAccountEmailError';
  }
}
