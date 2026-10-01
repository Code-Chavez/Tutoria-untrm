export class NotificationNotFoundError extends Error {
  constructor() {
    super('No se encontró la notificación');
    this.name = 'NotificationNotFoundError';
  }
}
