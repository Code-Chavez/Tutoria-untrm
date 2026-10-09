export class CatalogEntryNotFoundError extends Error {
  constructor() {
    super('El elemento del catálogo no existe');
    this.name = 'CatalogEntryNotFoundError';
  }
}

export class CatalogDuplicateError extends Error {
  constructor() {
    super('Ya existe un elemento con ese nombre o código en el catálogo');
    this.name = 'CatalogDuplicateError';
  }
}

export class CatalogEntryInUseError extends Error {
  constructor(public readonly usage: number) {
    super(
      `No se puede eliminar: está en uso en ${usage} registro(s). Desactívalo para retirarlo de las listas sin perder el historial.`,
    );
    this.name = 'CatalogEntryInUseError';
  }
}

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogValidationError';
  }
}
