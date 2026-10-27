/**
 * Fin de plazo de un envío. Solo deja de ESPERAR: no cancela el transporte SMTP, que sigue hasta sus propios tiempos de espera y
 * puede terminar el envío después. Por eso el vencimiento es un resultado INCIERTO y nunca prueba que el correo no salió.
 */
export class SendTimeoutError extends Error {
  constructor() {
    super('Se agotó el tiempo del envío');
    this.name = 'SendTimeoutError';
  }
}

export function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SendTimeoutError()), ms);
  });
  // Si el envío termina después del plazo, su resultado se ignora; esto evita un rechazo sin atender.
  work.catch(() => undefined);
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}
