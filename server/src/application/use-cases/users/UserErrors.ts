export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`El correo ${email} ya está registrado en el sistema.`);
    this.name = 'DuplicateEmailError';
  }
}
