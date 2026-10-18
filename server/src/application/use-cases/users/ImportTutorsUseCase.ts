import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { ImportTutorRow, TutorImportCreated, TutorImportError, TutorImportReport } from '@application/dtos/tutorImport.dto';
import { NAME_TOO_SHORT, PHONE_INVALID, STUDENT_NAME_MIN, isValidOptionalPhone } from '@application/validation/studentFields';
import { accountEmailProblem, createEmailPolicy, EmailPolicy, normalizeEmail } from '@application/validation/email';
import { TUTOR_ROLE_NAME } from '@application/use-cases/assignments/TutorValidation';
import { CreateUserUseCase } from './CreateUserUseCase';
import { IssueInvitationUseCase } from './IssueInvitationUseCase';

export class TutorRoleMissingError extends Error {
  constructor() {
    super('No existe el rol Docente Tutor');
    this.name = 'TutorRoleMissingError';
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Alta masiva de docentes tutores desde Excel: cada fila crea la cuenta (rol Docente Tutor, con su escuela) y le envía la
 * invitación de acceso único. Una fila con error no detiene a las demás; el informe dice qué se creó y qué no.
 */
export class ImportTutorsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly schools: SchoolRepository,
    private readonly createUser: CreateUserUseCase,
    private readonly issueInvitation: IssueInvitationUseCase,
    // Las mismas reglas de correo que el alta por formulario (CreateUserUseCase): formato y dominio permitido.
    private readonly emailPolicy: EmailPolicy = createEmailPolicy(undefined),
  ) {}

  async execute(rows: ImportTutorRow[], requesterId: string, ip?: string): Promise<TutorImportReport> {
    const tutorRole = await this.roles.findByName(TUTOR_ROLE_NAME);
    if (!tutorRole) throw new TutorRoleMissingError();
    const schoolByName = new Map((await this.schools.findAll()).map((s) => [normalize(s.name), s]));

    const errors: TutorImportError[] = [];
    const createdRows: TutorImportCreated[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const problems: string[] = [];
      const firstName = row.firstName?.trim() ?? '';
      const lastName = row.lastName?.trim() ?? '';
      if (!firstName) problems.push('El nombre es obligatorio');
      else if (firstName.length < STUDENT_NAME_MIN) problems.push(`El nombre ${NAME_TOO_SHORT}`);
      if (!lastName) problems.push('El apellido es obligatorio');
      else if (lastName.length < STUDENT_NAME_MIN) problems.push(`El apellido ${NAME_TOO_SHORT}`);

      const email = row.email?.trim() ? normalizeEmail(row.email) : '';
      if (!email) problems.push('El correo es obligatorio');
      else {
        const emailProblem = accountEmailProblem(email, this.emailPolicy);
        if (emailProblem) problems.push(emailProblem);
      }
      const phone = row.phone?.trim() ?? '';
      if (!isValidOptionalPhone(phone)) problems.push(PHONE_INVALID);

      const school = row.school?.trim() ? schoolByName.get(normalize(row.school)) : undefined;
      if (!row.school?.trim()) problems.push('La escuela profesional es obligatoria');
      else if (!school) problems.push(`No se encontró la escuela «${row.school.trim()}»`);

      if (email && seen.has(email)) problems.push('El correo está duplicado dentro del archivo');
      if (email && problems.length === 0 && (await this.users.findByEmail(email))) problems.push('Ya existe una cuenta con ese correo');

      if (problems.length > 0 || !school) {
        errors.push({ row: row.rowNumber, email: email || undefined, message: problems.join('; ') });
        continue;
      }
      seen.add(email);

      try {
        const user = await this.createUser.execute({ email, firstName, lastName, phone: phone || undefined, roleId: tutorRole.id, schoolId: school.id });
        const invitation = await this.issueInvitation.execute(requesterId, user.id, ip);
        createdRows.push({
          row: row.rowNumber,
          email,
          fullName: `${firstName} ${lastName}`,
          school: school.name,
          emailSent: invitation.emailSent,
          ...(invitation.emailSent ? {} : { invitationLink: invitation.link }),
        });
      } catch (error) {
        errors.push({ row: row.rowNumber, email, message: error instanceof Error ? error.message : 'No se pudo crear la cuenta' });
      }
    }

    return { totalRows: rows.length, created: createdRows.length, skipped: errors.length, createdRows, errors };
  }
}
