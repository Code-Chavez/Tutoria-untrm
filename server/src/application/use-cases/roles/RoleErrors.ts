export class RoleAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Ya existe un rol con el nombre "${name}"`);
    this.name = 'RoleAlreadyExistsError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el rol con ID ${id}`);
    this.name = 'RoleNotFoundError';
  }
}

export class RoleTargetUserNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el usuario con ID ${id}`);
    this.name = 'RoleTargetUserNotFoundError';
  }
}
