export class ReferralNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la derivación con ID ${id}`);
    this.name = 'ReferralNotFoundError';
  }
}
