import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TtlCache } from '@infrastructure/cache/TtlCache';

// Los roles y sus permisos solo cambian al sembrar o crear un rol; 30 s de desfase es aceptable y evita 3 consultas por petición.
export const ROLE_CACHE_TTL_MS = 30_000;

/** Decora el repositorio de roles con una caché corta de las lecturas por id y por nombre. */
export class CachedRoleRepository implements RoleRepository {
  private readonly byId: TtlCache<Role | null>;
  private readonly byName: TtlCache<Role | null>;

  constructor(
    private readonly inner: RoleRepository,
    ttlMs: number = ROLE_CACHE_TTL_MS,
    now: () => number = Date.now,
  ) {
    this.byId = new TtlCache(ttlMs, now);
    this.byName = new TtlCache(ttlMs, now);
  }

  findById(id: string): Promise<Role | null> {
    return this.byId.getOrLoad(id, () => this.inner.findById(id));
  }

  findByName(name: string): Promise<Role | null> {
    return this.byName.getOrLoad(name, () => this.inner.findByName(name));
  }

  findAll(): Promise<Role[]> {
    return this.inner.findAll();
  }

  async create(data: { name: string; description: string }): Promise<Role> {
    const role = await this.inner.create(data);
    this.byId.clear();
    this.byName.clear();
    return role;
  }
}
