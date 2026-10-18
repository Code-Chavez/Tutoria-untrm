export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado en el sistema.`);
    this.name = 'DuplicateEmailError';
  }
}

/** El correo no tiene formato válido o no es de un dominio permitido para cuentas de usuario (RF-01). */
export class InvalidAccountEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAccountEmailError';
  }
}
