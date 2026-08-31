export class ProfileUserNotFoundError extends Error {
  constructor() {
    super('No se encontró el perfil del usuario');
    this.name = 'ProfileUserNotFoundError';
  }
}

export class IncorrectCurrentPasswordError extends Error {
  constructor() {
    super('La contraseña actual es incorrecta');
    this.name = 'IncorrectCurrentPasswordError';
  }
}

export class SamePasswordError extends Error {
  constructor() {
    super('La nueva contraseña debe ser distinta de la actual');
    this.name = 'SamePasswordError';
  }
}
