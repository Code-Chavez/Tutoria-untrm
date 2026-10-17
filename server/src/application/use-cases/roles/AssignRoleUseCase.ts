import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { RoleNotFoundError, RoleTargetUserNotFoundError } from './RoleErrors';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { resolveService } from '../users/serviceAssignment';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { resolveTutorSchool } from '../users/tutorSchool';
import { resolveDeanFaculty } from '../users/deanFaculty';

/**
 * Asigna un rol a un usuario. El modelo es de un rol por usuario (la relación
 * many-to-many es rol↔permiso), por lo que "asignar" reemplaza el rol vigente.
 */
export class AssignRoleUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties?: FacultyRepository,
  ) {}

  async execute(userId: string, roleId: string, service?: string | null, schoolId?: string | null, facultyId?: string | null): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new RoleTargetUserNotFoundError(userId);
    }

    const role = await this.roles.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    // Al pasar a Profesional de Servicio hay que indicar el servicio; al salir de ese rol, se descarta.
    const newSchoolId = await resolveTutorSchool(this.schools, role.name, schoolId !== undefined ? schoolId : user.schoolId);
    const newFacultyId = await resolveDeanFaculty(this.faculties, role.name, facultyId !== undefined ? facultyId : user.facultyId);
    const updated = await this.users.update(userId, {
      roleId,
      service: resolveService(role.name, service !== undefined ? service : user.service),
      ...(newSchoolId !== (user.schoolId ?? null) && { schoolId: newSchoolId }),
      ...(newFacultyId !== (user.facultyId ?? null) && { facultyId: newFacultyId }),
    });

    await this.auditLogs.create({
      userId,
      action: 'ASSIGN_ROLE',
      entity: 'User',
      entityId: userId,
      details: `role=${role.name}${updated.service ? ` service=${updated.service}` : ''}`,
      ipAddress: null,
    });

    const { passwordHash: _password, ...safeUser } = updated;
    return safeUser;
  }
}
