/**
 * Caché en memoria con vencimiento. Solo para datos que casi no cambian (roles y sus permisos): cada petición
 * autenticada los releía de la base y eso era la mayor parte de su costo. Un valor `null` también se recuerda.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    const value = await load();
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}
