import { Prisma, PrismaClient } from '@prisma/client';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { UserNameLookup } from '@domain/repositories/UserNameLookup';
import { DuplicateEmailError, LastActiveAdministratorError } from '@application/use-cases/users/UserErrors';

/** Rol que hoy define la condición de administración. Cuando los roles sean configurables, esta condición pasará a ser por permisos (LEV-R14). */
export const ADMIN_ROLE_NAME = 'Administrador DBU';

export class PrismaUserRepository implements UserRepository, UserNameLookup {
  /** `adminRoleName` solo cambia en las pruebas, para trabajar con un rol de administración propio sin tocar las cuentas reales. */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adminRoleName: string = ADMIN_ROLE_NAME,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    // Sin distinguir mayúsculas: cubre cuentas guardadas antes de normalizar el correo.
    return this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  }

  async findNamesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } });
    return new Map(rows.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));
  }

  findAll(filters?: { isActive?: boolean; roleId?: string; service?: string }): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.roleId && { roleId: filters.roleId }),
        ...(filters?.service && { service: filters.service }),
      },
    });
  }

  // Si dos altas con el mismo correo llegan a la vez, la restricción única de la base decide: se informa como duplicado.
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateEmailError(data.email);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      // Solo desactivar o cambiar de rol puede dejar al sistema sin administradores: el resto de los cambios (p. ej. los intentos de
      // acceso fallidos, que son frecuentes) no toma el cierre.
      if (data.isActive !== undefined || data.roleId !== undefined) return await this.updateKeepingAnAdministrator(id, data);
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error) && data.email) throw new DuplicateEmailError(data.email);
      throw error;
    }
  }

  /**
   * Aplica el cambio y comprueba, en la misma transacción, que siga habiendo una cuenta de administración activa. El cierre sobre la
   * fila del rol de administración serializa las operaciones que podrían quitar administradores: sin él, dos solicitudes
   * simultáneas que por separado serían válidas (cada una ve al otro administrador activo) podrían dejar cero. Si la operación no
   * quita a un administrador activo, no se cuenta nada. Si la comprobación falla no se modifica ningún dato.
   */
  private updateKeepingAnAdministrator(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM roles WHERE name = ${this.adminRoleName} FOR UPDATE`;
      const target = await tx.user.findUnique({ where: { id }, include: { role: true } });
      if (target) {
        const isAdminNow = target.isActive && target.role.name === this.adminRoleName;
        const newRoleName = data.roleId !== undefined && data.roleId !== target.roleId ? (await tx.role.findUnique({ where: { id: data.roleId } }))?.name : target.role.name;
        const isAdminAfter = (data.isActive ?? target.isActive) && newRoleName === this.adminRoleName;
        if (isAdminNow && !isAdminAfter) {
          const others = await tx.user.count({ where: { id: { not: id }, isActive: true, role: { name: this.adminRoleName } } });
          if (others === 0) throw new LastActiveAdministratorError();
        }
      }
      return tx.user.update({ where: { id }, data });
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
