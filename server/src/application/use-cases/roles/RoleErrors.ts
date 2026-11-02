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

export class RoleProtectedError extends Error {
  constructor(name: string) {
    super(`El rol «${name}» es un rol base: se puede ver y copiar como plantilla, pero no modificar ni desactivar`);
    this.name = 'RoleProtectedError';
  }
}

export class RoleInUseError extends Error {
  constructor(name: string, users: number) {
    super(`No se puede desactivar el rol «${name}»: lo tienen ${users} cuenta${users === 1 ? '' : 's'}. Asígneles otro rol primero`);
    this.name = 'RoleInUseError';
  }
}

export class RoleInactiveError extends Error {
  constructor(name: string) {
    super(`El rol «${name}» está desactivado y no se puede asignar`);
    this.name = 'RoleInactiveError';
  }
}

export class UnknownPermissionError extends Error {
  constructor(codes: string[]) {
    super(`Permisos que no existen en el catálogo: ${codes.join(', ')}`);
    this.name = 'UnknownPermissionError';
  }
}

export class PermissionNotGrantableError extends Error {
  constructor(codes: string[]) {
    super(`No puede otorgar estos permisos: ${codes.join(', ')}. Son no delegables o usted no los tiene`);
    this.name = 'PermissionNotGrantableError';
  }
}

/** Un rol desactivado no se asigna (crear o cambiar el rol de una cuenta). */
export function assertRoleActive(role: { name: string; isActive?: boolean }): void {
  if (role.isActive === false) throw new RoleInactiveError(role.name);
}
