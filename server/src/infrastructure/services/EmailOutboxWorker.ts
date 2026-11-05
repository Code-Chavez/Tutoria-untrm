/** Lo único que el proceso de fondo necesita de lo que revisa: una revisión que devuelve cuántas entradas atendió. */
export interface DueProcessor {
  processDue(): Promise<number>;
}

/**
 * Proceso de fondo que reintenta los correos pendientes cada `intervalMs`. Evita solaparse consigo mismo y no impide
 * que el proceso termine. Al arrancar retoma lo que quedó pendiente de una ejecución anterior.
 */
export class EmailOutboxWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly processor: DueProcessor,
    /** Intervalo de REVISIÓN: no es una latencia máxima garantizada (depende de que el proceso esté activo y tenga capacidad). */
    private readonly intervalMs = 30_000,
    private readonly logger: Pick<Console, 'error'> = console,
    private readonly label = 'correos pendientes',
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
      this.logger.error(`[correo] Falló la revisión de ${this.label}:`, error);
    } finally {
      this.running = false;
    }
  }
}
