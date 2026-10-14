import { EmailOutboxProcessor } from '@application/services/EmailOutboxProcessor';

/**
 * Proceso de fondo que reintenta los correos pendientes cada `intervalMs`. Evita solaparse consigo mismo y no impide
 * que el proceso termine. Al arrancar retoma lo que quedó pendiente de una ejecución anterior.
 */
export class EmailOutboxWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly processor: EmailOutboxProcessor,
    private readonly intervalMs = 30_000,
    private readonly logger: Pick<Console, 'error'> = console,
  ) {}

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Visible para las pruebas. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processor.processDue();
    } catch (error) {
      this.logger.error('[correo] Falló el reintento de correos pendientes:', error);
    } finally {
      this.running = false;
    }
  }
}
